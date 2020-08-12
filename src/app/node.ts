import { SHA256 } from 'crypto-js';
import { Subscription, interval, ReplaySubject, BehaviorSubject, timer } from 'rxjs';
import { tap, map, first, filter, concatMap,  takeUntil, skip, distinctUntilKeyChanged, scan, distinctUntilChanged } from 'rxjs/operators';

export interface Block{
    data:any;
    hash:string;
    prev:string;
    nonce:number;
    height:number;
    timestamp:number;
    minedBy:string;
}

export interface CyclicBlock extends Block{
    cyclic?:boolean;
}

export interface Connection{
    id:string;
    mineSubs:Subscription;
    chainSubs:Subscription;
}

interface MineData{
    data:any;
    _time:number;
    _ref:string;
}

export class Node{
    static base:Block = {hash:0,height:-1} as any;

    static connect(id:string,node:Node){
        console.log('in static connect')
        const newNode = new Node(id);
        node.connect(newNode);
        newNode.connect(node);
        newNode.listen();

        return newNode;
    }

    static create(id:string){
        console.log('in static create')
        const newNode = new Node(id);
        newNode.initChain('Genesis');
        newNode.listen();

        return newNode;
    }

    static getEventHistory(replay$:ReplaySubject<Block>){
        console.log('in static getEventHistory')
        const events = [];

        replay$.pipe(takeUntil(timer(1))).subscribe(event=>{
            console.log('in replay$(chain$) subscribe,event:',event);
            events.push(event)
            // console.log('in replay$(chain$) subscribe,events:',events);
        });

        function showEvents(){
            console.log('the events:',events);
        }
        return {
            showEvents:showEvents,
            events
        };
    }

    static getLastEvent(replay$:ReplaySubject<Block>){
        console.log('in static getLastEvent')
        const {events} = Node.getEventHistory(replay$);

        return events.length?events.pop():Node.base;
    }

    static validateChain(lastBlock:Block,block:Block){
        console.log('in static validateChain')
        if(!lastBlock || !Node.validateBlock(lastBlock,block)){
            return;
        }

        return block;
    }

    static validateBlock(lastBlock:Block,block:Block){
        console.log('in static validateBlock')
        return (
            Node.validateParent(lastBlock,block) &&
            Node.validateDifficulty(block.hash) &&
            Node.validateHash(block)
        )
    }

    static validateHash(block:Block){
        console.log('in static validateHash')
        const { hash } = block;
        const tempBlock = {...block};

        delete tempBlock.hash;

        return hash === SHA256(JSON.stringify(tempBlock)).toString();
    }

    static validateParent(lastBlock:Block,block:Block){
        console.log('in static validateParent')
        return lastBlock.hash === block.prev &&
            lastBlock.height + 1 === block.height;
    }

    static validateDifficulty(hash:string){
        console.log('in static validateDifficulty')
        return /^00/.test(hash);
    }

    public chain$ = new ReplaySubject<Block>();
    public connections$ = new BehaviorSubject<Connection[]>([]);
    public mine$ = new BehaviorSubject<MineData>({_time:0} as any);
    public test;
    public history=[]

    constructor(public id:string){
        this.chain$.pipe(distinctUntilChanged()).subscribe(block=>{
            console.log('in constructor chain$ subscribe,event:',event);
            this.history.push(block)});
    }

    initChain(data:any){
        this.mine(data).subscribe(block=>{
            console.log('in initChain',block);
            this.chain$.next(block)});
    }

    process(data:any){
        console.log('in process')
        this.mine$.next({
            data,
            _ref:this.id,
            _time:Date.now()
        });
    }

    listen(){
        console.log('in listen')
        this.mine$
            .pipe(
                filter(event=>event&&event.data),
                concatMap(({data})=>{
                    console.log('in mine$ of listen')
                    return this.mine(data)
                }),
                filter(block=>Node.validateBlock(Node.getLastEvent(this.chain$),block)),
            ).subscribe(this.chain$)
    }

    connect(node:Node){
        let self = this;
        console.log('in connect,node:',node)

        const {events:history,showEvents} = Node.getEventHistory(node.chain$);
        console.log('in connect, event history:',history)
        console.log('in connect, this.history:',this.history)
        self.test = showEvents;

        const isValid = !!history.reduce(Node.validateChain,Node.base);

        if(!isValid){
            this.invalidate(node.id);
        }

        const mineSubs = this.connectMine(node);
        const chainSubs = this.connectChain(node);

        this.connections$.next([
            ...this.connections$.value,
            { mineSubs, chainSubs, id:node.id }
        ]);
    }

    invalidate(id:string){
        console.log('in invalidate')
        this.disconnect(id);

        throw new Error(`Disconnected from node ${id}`);
    }

    connectMine(node:Node){
        console.log('in connectMine,node:',node)
        return node.mine$.pipe(
            skip(1),
            filter(event => {
                console.log('in other mine$ of connectMine')
                return event._ref !==  this.id
            }),
            filter(event => event._time > this.mine$.value._time)
        ).subscribe(this.mine$);
    }

    connectChain(node:Node){
        console.log('in connectChain,node:',node)
        return node.chain$.pipe(
            distinctUntilKeyChanged('hash'),
            scan((lastBlock,block) =>{ 
                console.log(`in node.chain$ of connectChain,lastBlock:`,lastBlock,`block`,block)
                return Node.validateChain(lastBlock,block) ? block :
                    this.invalidate(node.id) as any}
                , Node.base),
            filter(block=>block.height > Node.getLastEvent(this.chain$).height)
        ).subscribe(this.chain$)
    }

    disconnect(id:string){
        console.log('in disconnect')
        const conn = this.connections$.value.find(item=>item.id===id);

        if(conn){
            conn.chainSubs.unsubscribe();
            conn.mineSubs.unsubscribe();
            this.connections$.next(
                this.connections$.value.filter(item=>item.id!==id)
            );
        }
    }



    mine(data:string){
        console.log('in mine')
        const lastBlock = Node.getLastEvent(this.chain$);

        const block = {
            data,
            nonce:0,
            minedBy:this.id,
            prev:lastBlock.hash,
            height:lastBlock.height+1,
            timestamp:Date.now()
        };

        return interval(0)
            .pipe(
                tap(nonce=>block.nonce=nonce),
                map(()=>SHA256(JSON.stringify(block))),
                first(hash=>Node.validateDifficulty(hash)),
                map<string,Block>(hash=>({
                    ...block,
                    hash:hash.toString()
                }))
            )
    }
}