echo "\
db.createUser(\
  {\
    user: '${MONGO_USERNAME}',\
    pwd: '${MONGO_PASSWORD}',\
    roles: [\
      { role: 'readWrite', db: '${MONGO_DATABASE}' },\
      { role: 'dbAdmin', db: '${MONGO_DATABASE}'}\
    ]\
  }\
);" | \
  mongosh --quiet mongodb://root:secret@localhost/admin
