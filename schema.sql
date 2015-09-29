CREATE TABLE IF NOT EXISTS digests (
    digest_id INTEGER PRIMARY KEY AUTOINCREMENT ,
    summary TEXT NOT NULL,
    user TEXT NOT NULL,
    message_url TEXT NOT NULL,
    channel TEXT NOT NULL,
    created DATETIME NOT NULL,
    status INT DEFAULT 0 NOT NULL,
    message TEXT DEFAULT "" NOT NULL
);