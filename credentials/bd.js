import ENV from 'dotenv'
ENV.config()
import mysql from 'mysql2'

const connections = mysql.createConnection({
    host: process.env.LOCAL_HOST,
    user: process.env.LOCAL_USER,
    port: process.env.DB_PORT,
    password: process.env.LOCAL_PASS,
    database: process.env.LOCAL_DB_NAME
})

connections.connect( e => {
    if(e) console.error('Error connecting to the database:', e)
    else console.assert('Connected to the database successfully!')
})

export default connections