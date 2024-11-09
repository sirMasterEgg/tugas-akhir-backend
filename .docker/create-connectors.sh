docker exec -it tugas_akhir_kafka_connect curl -i -X POST \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  http://localhost:8083/connectors/ \
  -d '{
    "name": "tugas-akhir-mysql-connector",
    "config": {
      "connector.class": "io.debezium.connector.mysql.MySqlConnector",
      "tasks.max": "1",
      "database.hostname": "tugas_akhir_mysql",
      "database.port": "3306",
      "database.user": "root",
      "database.password": "root",
      "database.server.id": "184054",
      "topic.prefix": "dbserver1",
      "database.include.list": "tugas_akhir",
      "schema.history.internal.kafka.bootstrap.servers": "tugas_akhir_kafka:9092",
      "schema.history.internal.kafka.topic": "schemahistory.tugas_akhir"
      "table.whitelist": "tugas_akhir.users"
    }
  }'
docker exec -it tugas_akhir_kafka_connect curl -i -X POST \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  http://localhost:8083/connectors/ \
  -d '{
    "name": "tugas-akhir-elastic-connector",
    "config": {
      "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
      "tasks.max": "1",
      "topics": "dbserver1.tugas_akhir.users",
      "connection.url": "http://tugas_akhir_elasticsearch:9200",
      "transforms": "unwrap,key",
      "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
      "transforms.key.type": "org.apache.kafka.connect.transforms.ExtractField$Key",
      "transforms.key.field": "id",
      "type.name": "tugas_akhir_users",
      "key.ignore": "false",
      "behavior.on.null.values": "delete"
    }
  }'

