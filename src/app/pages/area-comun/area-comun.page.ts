import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-area-comun',
  templateUrl: './area-comun.page.html',
  styleUrls: ['./area-comun.page.scss'],
  standalone: false,
})
export class AreaComunPage {
  constructor(private router: Router) {}
  goHome(): void { this.router.navigateByUrl('/home'); }
}
