# Local browser checks

End-to-end specs that run against a **local, seeded backend**. They live outside
`cypress/e2e` so `npm run test:e2e` doesn't pick them up.

## One-time setup (backend, SQLite — never the real database)

```sh
cd ../flowtali-be
export APP_ENV=local DB_CONNECTION=sqlite DB_DATABASE=/tmp/flowtali-e2e.sqlite DB_URL= \
       DB_HOST=127.0.0.1 DB_PORT=1 MAIL_MAILER=log QUEUE_CONNECTION=sync CACHE_STORE=file \
       SESSION_DRIVER=file FILESYSTEM_DISK=local CORS_ALLOWED_ORIGINS=http://localhost:5173 \
       FRONTEND_DASHBOARD_URL=http://localhost:5173/app/dashboard \
       PAYSTACK_SECRET_KEY= PAYSTACK_PUBLIC_KEY= BACHS_SECRET_KEY= BACHS_WEBHOOK_SECRET=
touch /tmp/flowtali-e2e.sqlite
php artisan migrate --force
php artisan db:seed --class=SubscriptionPlanSeeder --force
php artisan tinker --execute '(new App\Services\v1\Client\Auth\UserRegistrationService)->registerUser("Ada","Tester",true,"ada@example.test","Password123!"); App\Models\User::where("email","ada@example.test")->first()->forceFill(["email_verified_at"=>now()])->save(); $o=App\Models\Organization::first(); App\Models\Client::create(["organization_id"=>$o->id,"full_name"=>"Jane Doe","company"=>"Acme Ltd","client_type"=>"organization","email"=>"jane@acme.test"]);'
```

## Run

```sh
# API — from public/, with the env above exported in the same shell.
# Don't use `php artisan serve`: it re-reads .env for its child process and
# would ignore the overrides above.
(cd public && php -S 127.0.0.1:8340 ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php)

# Frontend, pointed at the local API
VITE_API_BASE_URL=http://localhost:8340 npx vite --port 5173

# Specs
npx cypress run --config specPattern="cypress/local/*.cy.ts",baseUrl=http://localhost:5173,video=false
```

Screenshots land in `cypress/screenshots/` (gitignored).
