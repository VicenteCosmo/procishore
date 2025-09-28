import ENV from 'dotenv';
ENV.config();
import express from 'express';
import bodyParser from 'body-parser';
import DB from './credentials/bd.js';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import qrcode from 'qrcode';

const app = express();
const PORT = process.env.PORT;

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    console.log(`Creating directory: ${uploadDir}`);
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

cloudinary.config({
    cloud_name: 'dsqazqsao',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

app.get('/', (req, res, next) => {
    const query = `SELECT certificate_number, holder_name, date_of_birth, id_number, course_start_date, course_end_date, issuing_date, expiry_date, status, img_url FROM ${process.env.LOCAL_DB_NAME}.${process.env.TABLE_NAME}`;

    DB.query(query, (err, result) => {
        if (err) console.error('Error getting the data:', err);
        res.render('home', { result });
    });
});

app.get('/certificates/:name', (req, res) => {
    const formattedName = req.params.name.toLowerCase().replace(/-/g, ' ');
    const holder_name = formattedName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    const query = `SELECT * FROM ${process.env.LOCAL_DB_NAME}.${process.env.TABLE_NAME} WHERE holder_name = ?`;

    DB.query(query, [holder_name], (err, result) => {
        if (err) {
            console.error('Error getting single certificate:', err);
            return res.status(500).send('Server Error');
        }

        if (result.length > 0) {
            res.render('single-certificate', { certificate: result[0] });
        } else {
            res.status(404).send('Certificate not found.');
        }
    });
});

app.get('/form', (req, res) => {
    res.render('form');
});

// A rota agora envia uma resposta JSON de volta ao cliente
app.post('/form', upload.single('image_file'), async (req, res) => {
    const {
        holder_name,
        certificate_number,
        date_of_birth,
        id_number,
        course_start_date,
        course_end_date,
        issuing_date,
        expiry_date
    } = req.body;

    let imgUrl = null;

    try {
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'certificates'
            });
            imgUrl = result.secure_url;
            fs.unlinkSync(req.file.path);
        }

        const query = `INSERT into ${process.env.LOCAL_DB_NAME}.${process.env.TABLE_NAME} 
                       (holder_name, certificate_number, date_of_birth, id_number, 
                        course_start_date, course_end_date, issuing_date, expiry_date, img_url) 
                       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        DB.query(query, [
            holder_name,
            certificate_number,
            date_of_birth,
            id_number,
            course_start_date,
            course_end_date,
            issuing_date,
            expiry_date,
            imgUrl
        ], async (err, result) => {
            if (err) {
                console.error('Error posting the data:', err);
                return res.status(500).json({ error: 'Error inserting data.' });
            }

            console.log('Data inserted successfully!');
            
            const urlPath = `/certificates/${holder_name.toLowerCase().replace(/ /g, '-')}`;
            const qrCodeDataUrl = await qrcode.toDataURL(`https://webetalink.com${urlPath}`);
            
            res.status(200).json({
                message: 'Data inserted and QR code generated successfully!',
                qrCodeUrl: qrCodeDataUrl,
                certificateUrl: urlPath
            });
        });
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        res.status(500).json({ error: 'Error uploading file.' });
    }
});

app.listen(PORT, e => {
    if (e) console.error('Error listening on port:', PORT);
    else console.log(`App running on port: ${PORT}`);
});