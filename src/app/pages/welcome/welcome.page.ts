import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
})
export class WelcomePage implements OnInit {


  constructor(
    private nav: NavController,
  ) { }

  ngOnInit() {
  }

  login() {
    this.nav.navigateForward('Star_Routing/login');
  }

}
