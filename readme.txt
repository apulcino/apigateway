# creation de l'image docker
docker build -t afp/apigateway .

// lancer l'image docker
docker run -p 8080:8080 -it afp/apigateway

# lancer apigateway dans un terminal pour vérifier la structure de l'image
docker run -p 8080:8080 -it afp/apigateway sh

/production
    +--- apigateway
        +--- library
        +--- config
/usr/src
    +-- apigateway
        +--- library
            +--- ...
        +--- node_modules
            +--- ...
        +---

    +-- config
        +--- default.json
        +--- production.json
        +--- developement.json


docker network create -d bridge --subnet 192.168.0.0/24 --gateway 192.168.0.1 dockernet