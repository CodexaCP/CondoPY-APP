import { Component, OnInit } from '@angular/core';
import { AuthService } from './core/auth.service';
import { PushService } from './core/push.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(private auth: AuthService, private pushSvc: PushService) {}

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.pushSvc.init();
    }
  }
}
