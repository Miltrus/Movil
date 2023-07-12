import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewProfilePage } from './view-profile.page';

describe('ProfilePage', () => {
  let component: ViewProfilePage;
  let fixture: ComponentFixture<ViewProfilePage>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(ViewProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
