import { createRouter, createWebHistory } from "vue-router";

import HomePage from "../pages/HomePage.vue";
import TagPage from "../pages/TagPage.vue";
import PostsPage from "../pages/PostsPage.vue";
import PostDetailPage from "../pages/PostDetailPage.vue";
import AboutPage from "../pages/AboutPage.vue";
import AdminPage from "../pages/AdminPage.vue";
import NotFoundPage from "../pages/NotFoundPage.vue";

const routes = [
  { path: "/", name: "home", component: HomePage },
  { path: "/posts", name: "posts", component: PostsPage },
  { path: "/post/:slug", name: "post", component: PostDetailPage },
  { path: "/tags/:tag/:keyword?", name: "tag", component: TagPage },
  { path: "/about", name: "about", component: AboutPage },
  { path: "/admin", name: "admin", component: AdminPage },
  { path: "/admin/list", name: "admin-list", component: AdminPage },
  { path: "/admin/new", name: "admin-new", component: AdminPage },
  { path: "/:pathMatch(.*)*", name: "not-found", component: NotFoundPage }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to) {
    if (to.hash) {
      return {
        el: to.hash,
        top: 90,
        behavior: "smooth"
      };
    }
    return { top: 0 };
  }
});

export default router;
