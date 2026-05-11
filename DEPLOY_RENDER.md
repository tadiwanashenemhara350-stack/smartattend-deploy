# Deploy SmartAttend on Render

 ## What is already prepared
 - `render.yaml` provisions:
 -   - a Docker-based web service named `smartattend`
     - - `Dockerfile` builds the React frontend and serves it through FastAPI
       - - the backend reads `DATABASE_URL` and `SECRET_KEY` from environment variables
         - - `robots.txt` and `sitemap.xml` are generated dynamically for the live domain
          
           -  ## Deploy steps
           -  1. Push this project to a GitHub, GitLab, or Bitbucket repository.
              2. 2. In Render, choose `New` -> `Blueprint`.
                 3. 3. Connect the repository that contains this project.
                    4. 4. Render will detect `render.yaml`.
                       5. 5. Review the generated resources:
                          6.   - web service: `smartattend`
                               - 6. Create the Blueprint and wait for the first deploy to finish.
                                 7. 7. Open the generated `onrender.com` URL and complete the first admin initialization from `/login`.
                                   
                                    8.  ## Recommended Render settings
                                   
                                    9.   - Use the **Free** plan for the web service. Note that it will sleep after inactivity.
                                         - - **IMPORTANT**: To avoid needing a credit card, I have removed the managed Render database.
                                           - - **For persistent data**, it is highly recommended to sign up for a free account at [Neon.tech](https://neon.tech) (PostgreSQL) and copy your connection string.
                                             - - In the Render dashboard, go to your service -> **Environment**, and update `DATABASE_URL` with your Neon connection string.
                                               - - If you don't provide a `DATABASE_URL`, the app will use SQLite, but your data will be reset every time the app restarts.
                                                
                                                 -  ## Make it discoverable on Google
                                                 -  1. After the site is live, copy the public site URL.
                                                    2. 2. In Google Search Console, add that URL as a property.
                                                       3. 
