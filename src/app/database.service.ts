import { Injectable } from "@angular/core";
import { ReplaySubject, Observable, Observer } from "rxjs";
import { take, filter } from "rxjs/operators";
import { Block } from "./node";

const VERSION=1;

@Injectable({
    providedIn:'root'
})
export class IndexDbService{
    db=new ReplaySubject<IDBDatabase | null>(1);
    $db = this.db.pipe(take(1),filter(db=>!!db));

    constructor(){
        const onError = error =>{
            console.log(error);
            this.db.complete();
        };

        if(!window.indexedDB){
            onError('IndexDB not available');
        }else{
            const openRequest = indexedDB.open('my-blockchain',VERSION)
            openRequest.onerror = () => onError(openRequest.error);
            openRequest.onsuccess = () => this.db.next(openRequest.result);
            openRequest.onupgradeneeded = () => {
                try {
                    const db:IDBDatabase = openRequest.result;
                    const surveyCacheStore = db.createObjectStore('block',{keyPath:'height'});
                    surveyCacheStore.createIndex('hash','hash');
                    surveyCacheStore.createIndex('prev','prev');
                    surveyCacheStore.createIndex('timestamp','timestamp')
                } catch (error) {
                    onError(error);
                }
            }
        }
    }

    get(storeName:string,key:number):Observable<Block | null>{
        return Observable.create((observer:Observer<Block>)=>{
            const onError = error =>{
                console.log(error);
                observer.complete();
            };
            this.$db.subscribe(db=>{
                try {
                    const txn = db.transaction([storeName],'readonly');
                    const store = txn.objectStore(storeName);
                    const getRequest:IDBRequest<Block> = store.get(key);
                    getRequest.onerror = ()=>onError(getRequest.error);
                    getRequest.onsuccess = ()=>{
                        const block = getRequest.result;
                        if(!block){
                            observer.next(null);
                        }else{
                            observer.next(getRequest.result);
                        }
                        observer.complete();
                    }
                } catch (err) {
                    onError(err);
                }
            })
        })
    }

    put(storeName:string,value:Block):Observable<IDBValidKey | null>{
        return Observable.create((observer:Observer<IDBValidKey>)=>{
            const onError = error =>{
                console.log(error);
                observer.complete();
            };
            this.$db.subscribe(db=>{
                try {
                    const txn = db.transaction([storeName],'readwrite');
                    const store = txn.objectStore(storeName);
                    const block:Block = value;
                    const putRequest = store.put(block);
                    putRequest.onerror = ()=>onError(putRequest.error);
                    putRequest.onsuccess = ()=>{
                        observer.next(putRequest.result);
                        observer.complete();
                    };
                } catch (err) {
                    onError(err)
                }
            })
        })
    }

    delete(storeName:string,key:any):Observable<any>{
        return Observable.create((observer:Observer<any>)=>{
            const onError = error =>{
                console.log(error);
                observer.complete();
            };
            this.$db.subscribe(db=>{
                try {
                    const txn = db.transaction([storeName],'readwrite');
                    const store = txn.objectStore(storeName);
                    const deleteRequest = store.delete(key);
                    deleteRequest.onerror = ()=>onError(deleteRequest.error);
                    deleteRequest.onsuccess = ()=>{
                        observer.next(deleteRequest.result);
                        observer.complete();
                    }
                } catch (err) {
                    onError(err);
                }
            })
        })
    }

    query(storeName:string):Observable<Block[]>{
        return Observable.create((observer:Observer<Block[]>)=>{
            const onError = error =>{
                console.log(error);
                observer.complete();
            };
            this.$db.subscribe(db=>{
                try {
                    const txn = db.transaction([storeName],'readonly');
                    const store = txn.objectStore(storeName);
                    const queryRequest =store.openCursor();
                    queryRequest.onerror = () => onError(queryRequest.error);
                    queryRequest.onsuccess = () =>{
                        const cursor = queryRequest.result;
                        if(cursor){
                            observer.next(cursor.value);
                            cursor.continue();
                        }else{
                            observer.complete();
                        }
                    }
                } catch (err) {
                    onError(err);
                }
            })
        })
    }

    clear(storeName:string){
        return Observable.create((observer:Observer<void>)=>{
            this.$db.subscribe(db=>{
                try {
                    db.transaction([storeName],'readwrite').objectStore(storeName).clear();
                } catch (error) {
                    console.log(error);
                }
            })
        })
    }
}