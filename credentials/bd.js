import ENV from 'dotenv'
ENV.config()
import mysql from 'mysql2'

const connections = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    port: process.env.DB_PORT,
    password: process.env.PASS,
    database: process.env.DB_NAME
})

connections.connect( e => {
    if(e) console.error('Error connecting to the database:', e)
    else console.assert('Connected to the database successfully!')
})

export default connections