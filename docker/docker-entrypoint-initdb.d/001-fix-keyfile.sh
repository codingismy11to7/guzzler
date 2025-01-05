cp -v /run/secrets/mongoKeyFile /data/configdb/mongoKeyFile
chown -v mongodb /data/configdb/mongoKeyFile
chmod -v 600 /data/configdb/mongoKeyFile
