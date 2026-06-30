import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { NotificationsService } from '../../core/notifications.service';

@Component({
  selector: 'app-area',
  templateUrl: './area.page.html',
  standalone: false,
})
export class AreaPage implements OnInit, OnDestroy {
  unreadCount = 0;
  private pollSub?: Subscription;

  constructor(private notifications: NotificationsService) {}

  ngOnInit(): void {
    this.pollSub = interval(30_000).pipe(
      startWith(0),
      switchMap(() => this.notifications.getUnreadCount().pipe(catchError(() => of({ count: 0 }))))
    ).subscribe(dto => { this.unreadCount = dto.count; });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
