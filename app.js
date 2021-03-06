const pkg = require('./package.json');
const env = process.env.NODE_ENV;
const port = process.env.PORT || 3000;
const localConfig = require('./config/env/'+env)
const path = require('path');
const fs = require('fs');
const Koa = require('koa')
const Redis = require('ioredis');
const Eureka = require('eureka-js-client').Eureka;
const Sequelize = require('sequelize');
const KoaOAuthServer = require('./modules/oauth2/oauth-koa2-server')
const OAuthRedisModel = require('./modules/oauth2/oauth-redis-model');

const moment = require('moment')
const requireAll = require('require-all');
const ex2k = require('express-to-koa');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerStat = require('swagger-stats');
const koaBodyParser = require('koa-bodyparser');
const koaRouter = require('koa-router')
const koaStatic = require('koa-static');
const koaExtension = require('./modules/extension');
const security = require('./modules/security');
const log4js = require('./modules/logger');
const log4jsIns = log4js.getLog4jsInstance(localConfig.serviceId, localConfig.log)
const logger = log4jsIns.getLogger("[MAIN]");
const constants = require('./config/constants');
const authCfg = require('./config/auth')
const network = require('./utils/NetworkUtils')
const app = new Koa()



function setGlobal(){

    global.JSService = {

        //环境变量
        env : {
            profile : env,
            port : port,
            host : network.getLocalHostName(),
            address : network.getLocalIPAddress(),
        },

        //本地配置
        config : localConfig,

        //日志
        logger : logger,

        //eureka
        eureka : null,

        //cache
        cache : null,

        //数据模型
        models : {}

    }
}

async function connectEurekaServer(){
    let eurekaConfig = {
        eureka : localConfig.eureka.server,
        logger : logger,
        instance: {
            app: localConfig.serviceId,
            hostName: JSService.env.host,
            ipAddr: JSService.env.address,
            statusPageUrl: 'http://'+JSService.env.address+':'+JSService.env.port+'/info',
            port: {
                '$': JSService.env.port,
                '@enabled': 'true',
            },
            vipAddress: localConfig.eureka.instance.address,
            dataCenterInfo: {
                '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
                name: 'MyOwn',
            },
            ... localConfig.eureka.instance
        },
    };

    Eureka.prototype.waitForConnected = function () {
        return new Promise((resolve, reject)=>{
            this.start();
            this.on("started", ()=>{
                resolve();
            });
        })
    }

    let eurekaClient = new Eureka(eurekaConfig)
    await eurekaClient.waitForConnected()

    eurekaClient.on("registered", ()=>{
        // Fired when the eureka client is registered with eureka.
    })
    eurekaClient.on("registryUpdated", ()=>{
        // Fired when the eureka client has successfully update it's registries.
    })

    JSService.eureka = eurekaClient;

}

async function connectRedisServer() {
    let redisConfig = localConfig.redis;

    Redis.prototype.waitForConnected = function () {
        return new Promise((resolve, reject)=>{
            this.on("ready", ()=>{
                resolve();
            });
            this.on("error", ()=>{
                reject('Connect redis server error.');
            });
        })
    }

    let redis = new Redis(redisConfig)
    await redis.waitForConnected()

    redis.on("reconnecting", ()=>{
        // emits after close when a reconnection will be made.
        // The argument of the event is the time (in ms) before reconnecting.
    })

    JSService.cache = redis;
}



function loadControllers(){
    const paths = [];
    const router = koaRouter();
    const controllers = requireAll({
        dirname     :  __dirname + '/controllers',
        filter      :  /(.+Controller)\.js$/,
        resolve     : function (ctrl) {
            return ctrl;
        }
    })
    for(let ctrl in controllers){
        for(let key in controllers[ctrl]){
            let arr = key.trim().split(/\s+/);
            let method = arr[0]
            let path = arr[1];
            if(arr.length <= 1){
                path = method;
                method = 'GET'; //默认GET
            }
            if(!router[method.toLowerCase()]){
                throw new Error(`Unknown controller method [ ${method} ] in ${ctrl}`);
            }
            router[method.toLowerCase()](path, controllers[ctrl][key])
            paths.push(path)
        }
    }

    router.prefix(constants.API_PREFIX)
    app.use(router.routes(), router.allowedMethods())

    logger.info('Loaded ' + paths.length + ' controllers.')
    return paths;
}

function initSwaggerAndStat(){
    const router = koaRouter();
    const options = {
        definition: {
            //openapi: '3.0.0',  // Specification (optional, defaults to swagger: '2.0')
            info: {
                title: localConfig.serviceId,
                version: pkg.version
            },
        },
        apis: ['./controllers/*Controller.js'],
    };
    const swaggerSpec = swaggerJSDoc(options);
    for(let key in swaggerSpec.paths){
        let newKey = `${constants.API_PREFIX}${key}`
        swaggerSpec.paths[newKey] = swaggerSpec.paths[key]
        delete swaggerSpec.paths[key]
    }
    router.get('/swagger-ui/swagger.json', (ctx, next) => {
        ctx.set('Content-Type', 'application/json');
        ctx.body = swaggerSpec;
    });
    app.use(router.routes(), router.allowedMethods())
    app.use(ex2k(swaggerStat.getMiddleware({ swaggerSpec : swaggerSpec })));
}

async function loadDBModels() {
    const dbConfig = localConfig.database
    if(dbConfig.options.dialect === 'sqlite'){
        const dbFilePath =  `${__dirname}/data/${localConfig.serviceId}.db`;
        dbConfig.options.storage = dbConfig.options.storage || dbFilePath;
    }else if(dbConfig.options.dialect === 'mysql'){

    }

    const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig.options);
    const models = requireAll({
        dirname     :  __dirname + '/models',
        filter      :  /(.+)\.js$/,
        resolve     : function (model) {
            return model;
        }
    })
    for(let key in models){
        const model = sequelize.define(key, models[key]);
        JSService.models[key] = model;
    }

    //同步、自动建表
    await sequelize.sync();
}

function useBaseMiddleware(){
    app.use(koaStatic(__dirname + '/public')) //静态目录
    app.use(koaBodyParser({
        enableTypes : ['json', 'form']
    }));
    app.use(koaExtension({
        logger : logger
    }))
    app.on('error', (err, ctx) => {
        if(err.status == 400 || err.status == 401 || err.status == 403){
            logger.warn(err.message)
            // logger.error(err)
        }else if(err.status == 200){
            // console.log(err)
        }else{
            logger.error('Internal server error', err)
        }
    });
}

async function createAPIServer() {

    // 1. 初始化全局变量
    setGlobal();

    // 2. KOA中间件
    useBaseMiddleware();

    // 3. 连接Redis Server
    await connectRedisServer();

    // 4. 连接Eureka Server
    await connectEurekaServer();

    // 5. Swagger UI & 监控（需要在路由之前）
    initSwaggerAndStat();

    // 6. 初始化权限
    initWebSecurity();

    // 7. 加载路由
    loadControllers();

    // 8. 加载数据模型
    await loadDBModels();

    // 9. OAuth2服务
    createOAuth2Server()

}

function initWebSecurity() {
    app.use(security({
        config: authCfg,
        logger: logger,
    }))
}

function createOAuth2Server(){
    const privatePath = path.resolve(__dirname, localConfig.oauth.privateKeyPath);
    const publicPath = path.resolve(__dirname, localConfig.oauth.publicKeyPath);
    const publicKey = String(fs.readFileSync(publicPath));
    const privateKey = String(fs.readFileSync(privatePath));
    const router = koaRouter();
    const oAuthServer = new KoaOAuthServer({
        logger: logger,
        model: new OAuthRedisModel({
            cache: JSService.cache,
            logger: logger,
            publicKey: publicKey,
            privateKey: privateKey,
        }),
    });
    //router.all("/oauth/authenticate", oAuthServer.authenticate());
    //router.all("/oauth/authorize", oAuthServer.authorize(option));
    router.post("/oauth/token", oAuthServer.token());
    router.get("/oauth/token_key", oAuthServer.tokenKey(publicKey));
    router.all("/oauth/check_token", oAuthServer.checkToken(publicKey));
    app.use(router.routes(), router.allowedMethods())

}


/***************************************************
 *
 * 启动服务入口
 *
 ***************************************************/

logger.info(`Starting ${localConfig.serviceId} ...`)
createAPIServer()
    .then(()=>{
        logger.info('Server Started.')
        console.info('------------------------------------------------------------------------')
        console.info('        Server URL          : http://' + JSService.env.address + ":" + JSService.env.port)
        console.info('        Eureka Server URL   : http://'
            + JSService.config.eureka.server.host + ":"
            + JSService.config.eureka.server.port
            + JSService.config.eureka.server.servicePath)
        console.info('        Profile             : ' + JSService.env.profile)
        console.info('------------------------------------------------------------------------')
    })
    .catch((e)=>{
        logger.error(e);
        process.exit()
    })

module.exports = app
