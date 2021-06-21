import r from "rethinkdb";

const connection = {
  host: process.env.DB_HOSTNAME,
  port: process.env.DB_PORT,
  db: process.env.DB,
};

var db = {
  r,
  insertData: (r, data) => {
    r.connect(connection).then((conn) => {
      return r.table("stocks-data").insert(data).run(conn);
    });
  },
};

export default db;
