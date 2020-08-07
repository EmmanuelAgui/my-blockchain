import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { NodeComponent } from './node.component';
import { BlockComponent } from './block.component';
import { ChainComponent } from './chain.component';

@NgModule({
  declarations: [
    AppComponent,
    NodeComponent,
    BlockComponent,
    ChainComponent
  ],
  imports: [
    BrowserModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
