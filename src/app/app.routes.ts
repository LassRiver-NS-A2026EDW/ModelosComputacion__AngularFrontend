import { Routes } from '@angular/router';
import { LoginComponent } from './components/views/login/login.component';
import { RegisterComponent } from './components/views/register/register.component';
import { HomeComponent } from './components/views/home/home.component';
import { CatalogComponent } from './components/views/catalog/catalog.component';
import { BookDetailComponent } from './components/views/book-detail/book-detail.component';
import { BookReaderComponent } from './components/views/book-reader/book-reader.component';
import { FavoritesComponent } from './components/views/favorites/favorites.component';
import { ReviewsComponent } from './components/views/reviews/reviews.component';
import { ProfileComponent } from './components/views/profile/profile.component';
import { AdminComponent } from './components/views/admin/admin.component';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'catalog', component: CatalogComponent },
  { path: 'books/:id', component: BookDetailComponent },
  { path: 'books/:id/read', component: BookReaderComponent },
  { path: 'favorites', component: FavoritesComponent },
  { path: 'reviews', component: ReviewsComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'admin', component: AdminComponent },
];
