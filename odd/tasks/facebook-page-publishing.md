# Facebook Page publishing
Publications can also be published to the Facebook Pages the user manages, reusing the Meta (Facebook Login for Business) connection and the existing publication_targets queue.
Branch: `feat/facebook-pages` from updated main. Production migrations and function deploys only with explicit user approval.

## Specs
- S1. User request: "quiero saber si con lo que tenemos ahora mismo es posible ampliar a Facebook lo que serían las publicaciones".
- S2. Permissions first: "quiero empezar por los permisos". The Meta app already has `pages_manage_posts` with Standard access, 0 API calls, App Review not requested (user screenshot, L4). Galia must request `pages_manage_posts` when connecting and verify it in the token, so the user can make the first real call in development mode and later request Advanced Access.
- S3. Connection (L5): "Mismo botón que Instagram". One Meta login stores the Instagram accounts and the Facebook Pages of the user, including Pages without a linked Instagram account. Existing connections without `pages_manage_posts` keep publishing to Instagram and are asked to reconnect to enable Facebook.
- S4. Formats (L5): "Feed: imagen, varias imágenes y vídeo". First version publishes to the Page feed one image, several images in one post, or the publication video. Out of scope: Facebook Reels and Stories.
- S5. Facebook targets use the existing scheduling, retries, status tracking and never-publish-twice protection of `publication_targets`; Instagram and LinkedIn behaviour stays unchanged.

## Tasks
- T0 | S2,S4 | parent | done (L6) | Check current official Meta Pages API: Page token requirements, photo, multi-photo (attached_media) and video feed endpoints, limits.
- T1 | S2,S3 | tbd | pending | Connection: request and verify `pages_manage_posts`, store Facebook Pages (with or without Instagram), reconnect notice for old connections.
- T2 | S4,S5 | tbd | pending | Server: migration (network `facebook`, account kind, RPCs), entry validation, Facebook publisher, dispatcher.
- T3 | S4,S5 | tbd | pending | Client: Facebook in the publish configuration, previews, media rules, status icons and error texts.
- T4 | S2 | user + parent | pending | Real test with the user's Page in development mode (first API call), then the user requests Advanced Access in App Review.

## T0 findings (official Meta docs, Graph v27.0, host graph.facebook.com)
- Permissions: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`. Page access token from `/me/accounts`; the user must be able to perform `CREATE_CONTENT` on the Page (`tasks` field). The Posts guide also lists `publish_video` for video while the Video API guide does not; T4 confirms with a real call.
- One image: `POST /{page-id}/photos` with `url` (public URL), `message`, `published=true` -> `{id, post_id}`. Photos up to 10 MB.
- Several images: each `POST /{page-id}/photos` with `url` and `published=false` -> photo id (kept ~24 h), then `POST /{page-id}/feed` with `message` and `attached_media[i]={"media_fbid":"<id>"}` -> post id. Maximum count is not documented.
- Video: `POST /{page-id}/videos` with `file_url` (public URL) and `description` -> video id; Meta processes it asynchronously. Alternative: Resumable Upload API handle. `graph-video.facebook.com` is deprecated.
- We publish immediately from our own queue (`run_at`), never with Meta `scheduled_publish_time` (community reports of OAuthException code 1 on scheduled posts since Oct 2025).
- Graph has no idempotency key: the irreversible step is the final `photos` (published), `feed` or `videos` call, guarded by `side_effect_pending` as in Instagram.

## Log
- L1. User: "quiero retomar el tema de publicaciones en redes sociales, hace poco hemos estado trabajando y la verdad que ha quedado genial pero quiero hacer una ampliación de funcionalidades aprovechando la integración con Instagram"
- L2. User: "la verdad que lo que propones está genial pero en realidad quiero saber si con lo que tenemos ahora mismo es posible ampliar a Facebook lo que serían las publicaciones". Exploration (task mwnlehj6-1-0na2): Facebook Login v27.0 with scopes `pages_show_list,instagram_basic,instagram_content_publish,business_management,pages_read_engagement` (src/redux/actions/SocialNetworksActions.ts:359-361); `instagramPages` drops Pages without IG (supabase/functions/_shared/social-instagram.ts); networks limited to instagram/linkedin in DB checks, RPCs (latest copy 20261125000100), social-publication-entry.ts and process-publication-targets publishers map (index.ts:343); no Meta token refresh.
- L3. User: "quiero empezar por los permisos, donde tengo que entrar para eso?"
- L4. User screenshot of App Review > Permisos y funciones: `pages_manage_posts`, Standard access, "Listas para usar (0)", "No se ha solicitado revisar la aplicación". Banner: Advanced Access only needed as tech provider, with business verification (Galia is one).
- L5. User decisions: connection "Mismo botón que Instagram (Recomendado)"; formats "Feed: imagen, varias imágenes y vídeo (Recomendado)". User: "Si, procede".
- L6. T0 done from developers.facebook.com: Page Photos, Page Feed, Page Videos references, Pages API Posts guide, Video API publishing guide (findings above).
