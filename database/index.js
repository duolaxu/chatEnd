const mysql = require('mysql');
// import mysql from "mysql";
const connection = mysql.createConnection({
  host: 'cd-cdb-kks45acg.sql.tencentcdb.com',
  user: 'root',
  password: 'mysql123!@#',
  port: '61736',
  database: 'platformInfo',
  // database: 'orderData',
})

connection.connect();
// const sql = 'SELECT * FROM merchant';
let res = 9;
//查
const query = ((sql, callback) => {
  connection.query(sql, function (err, result) {
    if (err) {
      console.log('[SELECT ERROR] - ', err.message);
      return;
    }
    callback(result);
    //    console.log('------------------------------------------------------------\n\n');  
  });
})

module.exports = {
  query
}

// export default query