/**
 * 环境配置文件
 */
module.exports = {

    /**********************************************************************************************
     *
     * 服务名称
     * ---------------------------------------------
     * 1.在所有微服务中确保唯一
     * 2.只能用英文、中划线、下划线
     *
     * eg: node_sso
     *
     **********************************************************************************************/
    serviceId : 'node-sso',


    /**********************************************************************************************
     *
     * OAuth服务器配置
     *
     **********************************************************************************************/
    oauth : {

        //生产环境要改掉
        clientId: 'web_app',

        //生产环境要改掉
        clientSecret: 'changeit',

        //内部微服务鉴权
        serviceClientId: 'internal',

        //内部微服务鉴权
        serviceClientSecret: 'internal',

        //私钥
        privateKeyPath: './config/cert/oauth-private.dev.pem',

        //公钥
        publicKeyPath: './config/cert/oauth-public.dev.pem',

        // accessTokenExpiresIn: 2*3600, //2 hours
        // refreshTokenExpiresIn: 1*24*3600, // 1 day
        accessTokenExpiresIn: 30, //2 hours
        refreshTokenExpiresIn: 60, // 1 day
    },


    /**********************************************************************************************
     *
     * 第三方登录
     *
     **********************************************************************************************/
    sso : {

        //微信
        wechat : {

            //应用（公从号&小程序）
            apps : {
                app1 : {
                    appId : '',
                    appSecret : '',
                    type : 'mp'
                },
                app2 : {
                    appId : '',
                    appSecret : '',
                    type : 'mp'
                },
                app3 : {
                    appId : '',
                    appSecret : '',
                    type : 'mini'
                }
            },

            //开放平台
            platform : {
                appId : '',
                appSecret : '',
            }
        },

        //支付宝
        alipay : {
            appId : '',
            appSecret : '',
        },

        //QQ
        qq : {
            appId : '',
            appSecret : '',
        },

        //新浪微博
        weibo : {
            appId : '',
            appSecret : '',
        }

    },


    /**********************************************************************************************
     *
     * 持久化（支持SQLite, MYSQL, PostgreSQL, MSSQL）
     *
     **********************************************************************************************/
    database : {

        database: 'node-sso',
        username : '',
        password : '',
        options : {
            dialect: 'sqlite',
            //storage: '/opt/log/jsservice/node-sso/sso.sqlite',
            operatorsAliases: false
        }

    },


    /**********************************************************************************************
     *
     * Eureka配置
     *
     **********************************************************************************************/
    eureka : {

        //服务端配置
        server : {
            host: 'localhost',
            port: 8761,
            servicePath: '/eureka/apps/',
            registryFetchInterval: 5000,
            preferIpAddress: true
        },

        //客户端配置（可选，覆盖默认配置）
        instance : {
            // app: 'node-service',
            // hostName: 'localhost',
            // ipAddr: '127.0.0.1',
            // statusPageUrl: 'http://localhost:8080/info',
            // port: {
            //     '$': 8080,
            //     '@enabled': 'true',
            // },
            vipAddress: 'something.com',
            // dataCenterInfo: {
            //     '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
            //     name: 'MyOwn',
            // },
        }
    },


    /**********************************************************************************************
     *
     * Spring Cloud Config配置
     *
     **********************************************************************************************/
    // cloudConfig : {
    //
    //     //Eureka服务名
    //     service: 'CONFIGSERVER',
    //
    //     //应用
    //     app : "ec.kfc_pre.sweet-go.portal:devnew_ec3",
    // },


    /**********************************************************************************************
     *
     * Redis Server 配置
     *
     **********************************************************************************************/
    redis : {

        // 哨兵
        // sentinels: [
        //     { host: "172.25.221.124", port: 26379 },
        //     { host: "172.25.221.125", port: 26379 },
        //     { host: "172.25.221.126", port: 26379 }
        // ],
        // name: "DEV",
        // db : 13

        // 单机
        port: 6379,
        host: "127.0.0.1",
        //password: "auth",
        db: 0,

    },


    /**********************************************************************************************
     *
     * HTTP客户端配置（axios）
     *
     **********************************************************************************************/
    // http : {
    //
    //     //请求超时时间（毫秒）
    //     timeout : 15000,
    //
    //     //EUREKA 服务名
    //     serviceName : 'EC.KFC_PRE.GATEWAY.SERVICE.V1_0_0',
    //
    // },

    /**********************************************************************************************
     *
     * 日志
     *
     **********************************************************************************************/
    log :{

        level : 'debug',

        //path : '/opt/log/jsservice/node-sso',

    },




}
