-- DropIndex
DROP INDEX "Ticket_seatId_key";

-- CreateIndex
CREATE INDEX "Ticket_seatId_idx" ON "Ticket"("seatId");
