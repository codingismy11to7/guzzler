cp -v /run/secrets/keyFile /data/configdb/keyFile
chown -v mongodb /data/configdb/keyFile
chmod -v 400 /data/configdb/keyFile
