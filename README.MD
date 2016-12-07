# SockySock
## WIP

## About
SockySock is a tiny socket wrapper. You can use it with any socket library.

## Done
- Emitting/Handling
- Callbacks

## TODO
- Promises
- Remote generators
- Bugfixes
- Better Readme

## Example
```js
    import SockySock from './SockySock.out.js'

    let bridge=new (require('events'))();

    let client = new SockySock({
        send(data){
            console.log('C C>S',data);
            bridge.emit('cs',data);
        },
        receive(receiver){
            bridge.on('sc',data=>{
                console.log('C S>C',data);
                receiver(data);
            })
        }
    });

    let server = new SockySock({
        send(data){
            console.log('S S>C',data);
            bridge.emit('sc',data);
        },
        receive(receiver){
            bridge.on('cs',data=>{
                console.log('S C>S',data);
                receiver(data);
            })
        }
    });
    //For example: Server has a long running task, that can be executed by client.
    server.on('task',(data,callback)=>{
        setTimeout(()=>{
            callback(data);
        },1000)
    });


    client.emit('task','123',(data)=>{
        console.log('Task runned successfully! Result is '+data);
    });
```