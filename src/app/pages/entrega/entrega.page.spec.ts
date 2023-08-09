import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntregaPage } from './entrega.page';

describe('EntregaPage', () => {
  let component: EntregaPage;
  let fixture: ComponentFixture<EntregaPage>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(EntregaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
