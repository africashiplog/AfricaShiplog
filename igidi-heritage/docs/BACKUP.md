# النسخ الاحتياطي والاستعادة

## ما الذي يجب نسخه؟
1. **قاعدة البيانات** (PostgreSQL) — كل السجلات والاستشهادات وسجل التعديلات.
2. **مجلد الملفات المرفوعة** (`UPLOAD_DIR`) — الصور والوثائق والتسجيلات.

## النسخ التلقائي
- مع Docker: خدمة `backup` في `docker-compose.yml` تنفّذ `scripts/backup.sh` يوميًا وتحفظ النسخ في `./backups` لمدة 30 يومًا.
- دون Docker: أضف مهمة cron على الخادم:
  ```
  15 2 * * * DB_HOST=localhost PGPASSWORD=... BACKUP_DIR=/var/backups/igidi UPLOAD_DIR=/srv/igidi/uploads sh /srv/igidi/scripts/backup.sh
  ```
- احتفظ بنسخة خارج الخادم (قرص خارجي أو تخزين سحابي).

## نسخة يدوية من لوحة الإدارة
«الاستيراد والتصدير ← تنزيل النسخة الاحتياطية (JSON)» تنزّل كل البيانات البحثية وسجل التعديلات في ملف واحد مقروء (دون كلمات المرور)، وتُسجَّل العملية في سجل التعديلات. لا تتضمن الملفات المرفوعة نفسها.

## الاستعادة
```
createdb -U igidi igidi_restored
pg_restore -U igidi -d igidi_restored igidi-db-YYYYMMDD-HHMMSS.dump
tar -xzf igidi-uploads-YYYYMMDD-HHMMSS.tar.gz -C /path/to/uploads
```
ثم وجّه `DATABASE_URL` إلى القاعدة المستعادة. جرّب الاستعادة دوريًا للتأكد من صلاحية النسخ.

## الملفات المحذوفة
حذف ملف من اللوحة ينقله إلى `UPLOAD_DIR/.trash/` ولا يمحوه، ويبقى سجله في «سجل التعديلات».
