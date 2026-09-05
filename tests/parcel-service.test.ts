import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { createParcel, updateParcelStatus, deliverParcel, ParcelServiceError } from "@/services/parcel-service";
import { resetDatabase, createBranch, createPaymentMethods, createUser, openCashSession } from "./helpers";

describe("parcel-service", () => {
  let originBranchId: string;
  let destBranchId: string;
  let cashId: string;
  let userId: string;

  beforeEach(async () => {
    await resetDatabase();
    const { branch, cashRegister } = await createBranch("ORG");
    const { branch: dest, cashRegister: destCashRegister } = await createBranch("DST");
    const { cash } = await createPaymentMethods();
    const user = await createUser();

    originBranchId = branch.id;
    destBranchId = dest.id;
    cashId = cash.id;
    userId = user.id;

    await openCashSession(cashRegister.id, userId, 0);
    await openCashSession(destCashRegister.id, userId, 0);
  });

  it("creates a parcel with a unique tracking number and no financial transaction when nothing is paid upfront", async () => {
    const parcel = await createParcel(
      {
        senderName: "Sender",
        senderPhone: "+22200000001",
        recipientName: "Recipient",
        recipientPhone: "+22200000002",
        destinationBranchId: destBranchId,
        shippingPrice: 500,
        discount: 0,
        amountDueOnDelivery: 1000,
        amountPaid: 0,
        piecesCount: 1,
      },
      { employeeId: userId, originBranchId }
    );

    expect(parcel.trackingNumber).toMatch(/^ASL\d+$/);
    expect(parcel.status).toBe("RECEIVED");
    expect(parcel.payments).toHaveLength(0);
    expect(parcel.statusHistory).toHaveLength(1);
  });

  it("creates a linked FinancialTransaction when the shipping fee is paid upfront", async () => {
    const parcel = await createParcel(
      {
        senderName: "Sender",
        senderPhone: "+22200000001",
        recipientName: "Recipient",
        recipientPhone: "+22200000002",
        destinationBranchId: destBranchId,
        shippingPrice: 500,
        discount: 0,
        amountDueOnDelivery: 0,
        amountPaid: 500,
        paymentMethodId: cashId,
        piecesCount: 1,
      },
      { employeeId: userId, originBranchId }
    );

    const tx = await prisma.financialTransaction.findFirst({ where: { parcelId: parcel.id, type: "PARCEL_FEE" } });
    expect(tx).not.toBeNull();
    expect(tx!.amount.toString()).toBe("500");
  });

  it("rejects delivery when the collected amount doesn't match amountDueOnDelivery", async () => {
    const parcel = await createParcel(
      {
        senderName: "S",
        senderPhone: "+22200000001",
        recipientName: "R",
        recipientPhone: "+22200000002",
        destinationBranchId: destBranchId,
        shippingPrice: 100,
        discount: 0,
        amountDueOnDelivery: 2000,
        amountPaid: 0,
        piecesCount: 1,
      },
      { employeeId: userId, originBranchId }
    );
    await updateParcelStatus(parcel.id, "READY_FOR_PICKUP", null, userId, destBranchId);

    await expect(
      deliverParcel(parcel.id, { recipientName: "R", recipientPhone: "+22200000002", amountCollected: 500, paymentMethodId: cashId }, userId, destBranchId)
    ).rejects.toThrow(ParcelServiceError);
  });

  it("delivers successfully with the correct COD amount and blocks a second delivery", async () => {
    const parcel = await createParcel(
      {
        senderName: "S",
        senderPhone: "+22200000001",
        recipientName: "R",
        recipientPhone: "+22200000002",
        destinationBranchId: destBranchId,
        shippingPrice: 100,
        discount: 0,
        amountDueOnDelivery: 2000,
        amountPaid: 0,
        piecesCount: 1,
      },
      { employeeId: userId, originBranchId }
    );
    await updateParcelStatus(parcel.id, "READY_FOR_PICKUP", null, userId, destBranchId);

    const delivered = await deliverParcel(
      parcel.id,
      { recipientName: "R", recipientPhone: "+22200000002", amountCollected: 2000, paymentMethodId: cashId },
      userId,
      destBranchId
    );
    expect(delivered.status).toBe("DELIVERED");

    const codTx = await prisma.financialTransaction.findFirst({ where: { parcelId: parcel.id, type: "COD_COLLECTION" } });
    expect(codTx!.amount.toString()).toBe("2000");

    await expect(
      deliverParcel(parcel.id, { recipientName: "R", recipientPhone: "+22200000002", amountCollected: 2000, paymentMethodId: cashId }, userId, destBranchId)
    ).rejects.toThrow(ParcelServiceError);
  });

  it("records a full, ordered status history as the parcel moves through the workflow", async () => {
    const parcel = await createParcel(
      {
        senderName: "S",
        senderPhone: "+22200000001",
        recipientName: "R",
        recipientPhone: "+22200000002",
        destinationBranchId: destBranchId,
        shippingPrice: 100,
        discount: 0,
        amountDueOnDelivery: 0,
        amountPaid: 0,
        piecesCount: 1,
      },
      { employeeId: userId, originBranchId }
    );

    await updateParcelStatus(parcel.id, "REGISTERED", null, userId, originBranchId);
    await updateParcelStatus(parcel.id, "DISPATCHED", null, userId, originBranchId);
    await updateParcelStatus(parcel.id, "IN_TRANSIT", null, userId, originBranchId);
    await updateParcelStatus(parcel.id, "ARRIVED", "وصل بالسلامة", userId, destBranchId);

    const history = await prisma.parcelStatusHistory.findMany({ where: { parcelId: parcel.id }, orderBy: { createdAt: "asc" } });
    expect(history.map((h) => h.newStatus)).toEqual(["RECEIVED", "REGISTERED", "DISPATCHED", "IN_TRANSIT", "ARRIVED"]);
  });
});
