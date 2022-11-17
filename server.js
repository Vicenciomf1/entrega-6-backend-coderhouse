// Servidor
const express = require('express');
const {engine} = require("express-handlebars");
const Contenedor = require('./Contenedor.js');
const app = express();
const PORT = 8080;
const publicRoot = "./public";
//Entrega Websockets
const {Server: IOServer} = require('socket.io');
const {Server: HttpServer} = require('http');

//Crear cositas para la entrega de websockets
const httpServer = new HttpServer(app);
const io = new IOServer(httpServer);

// Importar productos y mensajes
const contenedorProductos = new Contenedor('productos.txt');
const contenedorMensajes = new Contenedor('mensajes.txt');

// Para usar json
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicRoot));

// Para el motor de plantillas
app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'index.hbs',
    layoutsDir: __dirname + '/views/layouts'
}));
app.set('views', __dirname + '/views');
app.set('view engine', 'hbs');

// Rutas
app.get('/', (req, res) => {
    res.render('templates/chat');
});

app.get('/formularioNuevoProducto', async (req, res) => {
    res.render('templates/formulario');
});

app.get('/productos', async (req, res) => {
    const productos = await contenedorProductos.getAll();
    res.render('templates/lista', {productos});
});

app.post('/productos', async (req, res) => {
    const producto = req.body;
    await contenedorProductos.save(producto);
    res.redirect('/productos');
});



const servidor = httpServer.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${servidor.address().port}`);
});
servidor.on("error", error => console.log(`Encontramos el siguiente error en el servidor: ${error}`));

//Sockets
io.on('connection', async (socket) => {
    console.log('Se ha conectado un nuevo cliente');

    const listaDeProductos = await contenedorProductos.getAll();
    socket.emit('nueva-conexion', listaDeProductos);

    socket.on("new-product", (data) => {
        contenedorProductos.save(data);
        io.sockets.emit('producto', data);
    });

    //Para enviar todos los mensajes en la primera conexion
    const listaMensajes = await contenedorMensajes.getAll();
    socket.emit('messages', listaMensajes);

    //Evento para recibir nuevos mensajes
    socket.on('new-message', async data => {
        const tiempo = new Date();
        // Como lo uso una sola vez preferí no usar momentjs, pero si lo uso más de una vez la instalaré
        data.time = `${tiempo.getDate()}/${tiempo.getMonth() + 1}/${tiempo.getFullYear()} ${tiempo.getHours()}:${tiempo.getMinutes()}:${tiempo.getSeconds()}`;
        await contenedorMensajes.save(data);
        const listaDeMensajes = await contenedorMensajes.getAll();
        io.sockets.emit('messages', listaDeMensajes);
    });

    socket.on('disconnect', () => {
        console.log('Se ha desconectado un cliente');
    });
});

  