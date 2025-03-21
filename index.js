const express = require('express')
const app = express()
const http = require('http')
const cors = require('cors')




const {Server} = require('socket.io')
app.use(cors())
const server = http.createServer(app)
const io = new Server(server, {
    cors : {
        origin: "*",
        methods: ['GET', 'POST']
    }
})
const socket = io


io.on("connection", (socket)=>{
    socket.emit('me', socket.id)
    console.log("connected", socket.id);
    socket.on('join_room', (z)=> {
        socket.join(z)
        console.log('socket', z)
    })

    socket.on('sendMessage', (z)=> {
      
        console.log('socket', z)
    })

    socket.on('disconnect', ()=>{
        
       socket.broadcast.emit('call ended')
    })

    socket.on('callUser', ({userToCall, signalData, from, name, }) =>{
        io.to(userToCall).emit('calluser', {signal: signalData, from, name})
        socket.broadcast.emit('call ended')
     })

     socket.on('answercall', (data)=>{
        io.to(data.to).emit('callAccepted', data.signal)
     })
})


server.listen(3000, ()=>{
    console.log('server run')
})