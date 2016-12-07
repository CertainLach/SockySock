// Copyright 2016 (c) Yaroslaw Bolyukin <hhhaker6@gmail.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

//BUILD CUT START
process.env.F6CF_TEST=true;

// Test runner
if(typeof process !== 'undefined' && process.env.F6CF_TEST){
    let globalScope = (typeof window==='undefined'?global:window);
    (process.testLog || console.log)('Running in test envrivoment!');
    globalScope._F6CF_GLOBAL_ALL_MODULES_ = true;
    globalScope._RUN_TESTS_ = true;
}
//BUILD CUT END

// Closure for browser
(function(root,forceRoot){
    const NEEDED_OPTIONS = [
        'send', // Used for sending data tought socket connection
        'receive', // Used for receiver init
    ]
    const DEFAULT_OPTIONS = {
        async:true, // Use promises instead of callbacks
        callbackTimeout:3000, // 5m

        serialize(data){
            return JSON.stringify(data); //TODO: Opensource JSONA
        },
        deserialize(string){
            return JSON.parse(string); //TODO: Opensource JSONA
        },
        randomString(){
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char=>{
                let random = Math.random()*16|0;
                let outChr = char == 'x' ? random : (random&0x3|0x8);
                return outChr.toString(16);
            });
        },
    }
    class SockySock{
        constructor(options, ...wtf){
            // Validation
            // Because good users need to use it propper way :D
            if(!options)
                throw new Error('No options passed!');
            if(typeof options !== 'object')
                throw new Error('Options must be object!');
            options.test = true;
            if(!options.test){
                throw new Error('Options object must be mutable!');
            }
            if(wtf.length !== 0)
                throw new Error('Only one argument must be passed!');
            for(let optionName of NEEDED_OPTIONS){
                if(!options[optionName])
                    throw new Error(`Option "${optionName}" is not defined!`);
            }
            if(!!options.serialize^!!options.deserialize){
                throw new Error('Both serialize and deserialize must be set! (Or none of them)')
            }
            if(options.callbackTimeout&&options.callbackTimeout<0){
                throw new Error('Callback timeout must be >= 0!')
            }
            for(let optionName in DEFAULT_OPTIONS){
                if(!DEFAULT_OPTIONS.hasOwnProperty(optionName))
                    continue;
                if(!options[optionName])
                    options[optionName] = DEFAULT_OPTIONS[optionName];
            }
            this.options=options;
            // Bind
            this.options.send=this.options.send.bind(this.options);
            this.options.receive=this.options.receive.bind(this.options);
            // Initialization
            this.callbacks={};
            this.timeouts={};
            this.options.receive(data=>{
                this.onReceive(data);
            });

            let self=this;
            this.handlers={
                _callbackCall({id,params}){
                    if(self.callbacks[id]){
                        self.callbacks[id](params);
                    }else{
                        throw new Error('Callback is invalid!');
                    }
                }
            };
        }
        onReceive(data){
            let objData=this.options.deserialize(data);
            console.log(objData);
            let type=objData.type;
            if(!this.handlers[type]){
                //BUILD CUT START
                console.log('No handlers for type '+type);
                //BUILD CUT END
                return;
            }
            let outParams=[];
            let params=objData.params;
            for(let param of params){
                if(param.$callback){ // Callback receive
                    outParams.push((...params)=>{
                        this.emit('_callbackCall',{
                            id:param.$callback,
                            params
                        });
                    });
                }else{
                    outParams.push(param);
                }
            }
            this.handlers[type](...outParams);
        }
        emit(type,...dataParams){
            let outParams=[];
            for(let param of dataParams){
                if(typeof param === 'function'){ // Callback
                    let id=this.options.randomString();
                    this.callbacks[id]=(...params)=>{ // Hook function execution
                        clearTimeout(this.timeouts[id]);
                        delete this.callbacks[id];
                        delete this.timeouts[id];
                        return param(...params);
                    }
                    this.timeouts[id] = setTimeout(()=>{
                        delete this.callbacks[id];
                        delete this.timeouts[id];
                        //BUILD CUT START
                        console.log(`Timeout exceeded: ${id}`);
                        //BUILD CUT END
                    },this.options.callbackTimeout);
                    outParams.push({ //TODO: Use JSONA
                        $callback: id
                    });
                }else{
                    outParams.push(param);
                }
            }
            console.log(outParams);
            this.options.send(this.options.serialize({
                type,
                params:outParams
            }));
        }
        on(type,fn){
            this.handlers[type]=fn;
        }
    }

    // Exports for almost all module systems
    let exported = false;
    if(typeof module !== 'undefined'){   // Node.JS
        module.exports=SockySock;
        exported = true;
    } else if(typeof I !== 'undefined'){ // Total.JS
        I.sockySock=SockySock;
        exported = true;
    }                                    //TODO: AMD
    if(!exported || forceRoot)           // Browser?
        root.SockySock=SockySock;
})(
    typeof window==='undefined'?global:window,
    typeof jQuery!=='undefined' // For newbies (Native DOM api is better IMHO)
    //BUILD CUT START
    || typeof _F6CF_GLOBAL_ALL_MODULES_!=='undefined' // For internal projects
    //BUILD CUT END
);

//BUILD CUT START
// Tests
//TODO: Write use test result receivers
if(typeof _RUN_TESTS_!=='undefined'){
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
};
//BUILD CUT END

