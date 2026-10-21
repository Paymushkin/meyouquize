-- Rollback networking experiment tables (run manually or via DROP_NETWORKING_TABLES=1 script)

DROP TABLE IF EXISTS "NetworkingMessage";
DROP TABLE IF EXISTS "NetworkingThread";
DROP TABLE IF EXISTS "ParticipantProfile";
