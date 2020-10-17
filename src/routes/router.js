const pool = require('../database/db');
const router = require('express').Router();
/* 
ENDPOINTS 
GET /api/v1/publicaciones
GET /api/v1/publicaciones?busqueda=<palabra>

CURL COMMANDS
curl -H "Content-Type: application/json" -X GET http://localhost:3000/api/v1/publicaciones
curl -H "Content-Type: application/json" -X GET http://localhost:3000/api/v1/publicaciones?busqueda=Roma
*/
router.get('/api/v1/publicaciones', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err)
            throw new Error(err);
        let query = '', searchQuery = '';
        const search = req.query.busqueda;
        if (search) {
            searchQuery = `WHERE (
                titulo LIKE '${search}%' OR 
                resumen LIKE '${search}%' OR 
                contenido LIKE '${search}%' )`;
        }
        query = `SELECT * FROM publicaciones ${searchQuery}`;
        connection.query(query, (err, rows) => {
            if (err)
                throw new Error(err);
            res.status(200).json(rows);
        });
    });
});
/* 
ENDPOINT
GET /api/v1/publicaciones/<id>

CURL COMMAND
curl -H "Content-Type: application/json" -X GET http://localhost:3000/api/v1/publicaciones/7
*/
router.get('/api/v1/publicaciones/:id', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err)
            throw new Error(err);
        const id = connection.escape(req.params.id);
        const query = `SELECT * FROM publicaciones WHERE id=${id}`;
        connection.query(query, (err, rows) => {
            if (err)
                throw new Error(err);
            if (rows.length > 0) {
                res.status(200).json(rows);
            } else {
                res.status(404).send('Publicación no encontrada\n');
            }
        });
    });
});
/* 
ENDPOINTS 
GET /api/v1/autores
GET /api/v1/autores/<id>

CURL COMMANDS
curl -H "Content-Type: application/json" -X GET http://localhost:3000/api/v1/autores
curl -H "Content-Type: application/json" -X GET http://localhost:3000/api/v1/autores/2
*/
router.get('/api/v1/autores/:id?', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err)
            throw new Error(err);
        let query = '';
        const id = req.params.id;
        if (id) {
            query = `
                SELECT * FROM publicaciones p
                JOIN autores a ON p.autor_id = a.id
                WHERE a.id = ${connection.escape(id)}
            `;
        } else {
            query = 'SELECT * FROM autores';
        }
        connection.query(query, (err, rows) => {
            if (err)
                throw new Error(err);
            if (rows.length > 0) {
                res.status(200).json(rows);
            } else {
                res.status(404).send('Autor no encontrado\n');
            }
        });
    });
});
/* 
ENDPOINT
POST /api/v1/autores

CURL COMMAND
curl -H "Content-Type: application/json" -X POST -d '{"pseudonimo": "luis2000","email":"luis@email.com","contrasena":"ws123"}' http://localhost:3000/api/v1/autores
*/
router.post('/api/v1/autores', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err)
            throw new Error(err);
        const { pseudonimo, email, contrasena } = req.body;
        let query = '';
        query = `SELECT pseudonimo, email FROM autores WHERE (
        pseudonimo=${connection.escape(pseudonimo)} OR 
        email=${connection.escape(email)} )`;
        connection.query(query, (err, rows) => {
            if (err)
                throw new Error(err);
            let message = '';
            if (rows.length > 0) {
                const user = rows[0];
                if (user.pseudonimo === pseudonimo) {
                    message = 'Ya existe un autor con este pseudonimo';
                } else if (user.email === email) {
                    message = 'Ya existe un autor con este correo electrónico';
                }
            }
            if (message === '') {
                query = `
                    INSERT INTO autores VALUES (
                    NULL,    
                    ${connection.escape(email)},
                    ${connection.escape(contrasena)},
                    ${connection.escape(pseudonimo)},
                    NULL)
                `;
                connection.query(query, (err_, rows_) => {
                    if (err_)
                        throw new Error(err_);
                    res.status(200).json({ ...req.body, id: rows_.insertId, avatar: null });
                });
            } else {
                res.status(400).send(`${message}\n`);
            }
        });
    });
});
/* 
ENDPOINT
POST /api/v1/publicaciones?email=<email>&contrasena=<contrasena>

CURL COMMAND
curl -H "Content-Type: application/json" -X POST -d '{"titulo":"Megaman X","resumen":"Es un excelente juego!", "contenido": "Se ingreso una publicacion de vídeo juegos"}' http://localhost:3000/api/v1/publicaciones?email=luis@email.com\&contrasena=123123
*/
router.post('/api/v1/publicaciones', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err)
            throw new Error(err);
        let query = '';
        const { titulo, resumen, contenido } = req.body;
        const { email, contrasena } = req.query;
        query = `SELECT id, contrasena FROM autores WHERE email=${connection.escape(email)}`;
        connection.query(query, (err, rows) => {
            if (err)
                throw new Error(err);
            if (rows.length > 0) {
                const user = rows[0];
                if (user.contrasena === contrasena) {
                    const fecha_hora = new Date().toJSON().slice(0, 19).replace('T', ' ');
                    const votos = Math.floor(Math.random() * 10);
                    query = `
                        INSERT INTO publicaciones VALUES (
                        NULL,    
                        ${connection.escape(titulo)},
                        ${connection.escape(resumen)},
                        ${connection.escape(contenido)},
                        NULL,
                        ${votos},
                        ${connection.escape(fecha_hora)},
                        ${user.id})
                    `;
                    connection.query(query, (err_, rows_) => {
                        if (err_)
                            throw new Error(err_);
                        res.status(200).json({ ...req.body, id: rows_.insertId, autor_id: user.id, fecha_hora, votos });
                    });
                } else {
                    res.status(403).send('Contraseña incorrecta\n');
                }
            } else {
                res.status(404).send('Autor no encontrado con este correo electrónico\n');
            }
        });
    });
});
/* 
ENDPOINT
DELETE /api/v1/publicaciones/<id>?email=<email>&contrasena=<contrasena>

CURL COMMAND
curl -H "Content-Type: application/json" -X DELETE http://localhost:3000/api/v1/publicaciones/3?email=luis@email.com\&contrasena=123123
*/
router.delete('/api/v1/publicaciones/:id', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err)
            throw new Error(err);
        let query = '';
        const id = req.params.id;
        const { email, contrasena } = req.query;
        query = `SELECT id, contrasena FROM autores WHERE email=${connection.escape(email)}`;
        connection.query(query, (err, rows) => {
            if (err)
                throw new Error(err);
            if (rows.length > 0) {
                const user = rows[0];
                if (user.contrasena === contrasena) {
                    query = `SELECT titulo FROM publicaciones WHERE (
                        id=${connection.escape(id)} AND autor_id=${connection.escape(user.id)} 
                    )`;
                    connection.query(query, (err_, rows_) => {
                        if (err_)
                            throw new Error(err_);
                        if (rows_.length > 0) {
                            query = `DELETE FROM publicaciones WHERE id=${connection.escape(id)}`;
                            connection.query(query, (err_) => {
                                if (err_)
                                    throw new Error(err_);
                                res.status(200).send("Publicación eliminada con éxito\n");
                            });
                        } else {
                            res.status(400).send(`La publicación con id (${id}), no le pertenece al usuario ${email}\n`);
                        }
                    });
                } else {
                    res.status(403).send('Contraseña incorrecta\n');
                }
            } else {
                res.status(404).send('Autor no encontrado con este correo electrónico\n');
            }
        });
    });
});

module.exports = router;




