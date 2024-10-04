import express from "express";
import expressEjsLayouts from "express-ejs-layouts";
import UserHandler from "./app/userHandler,js"; 
import session from "express-session"
import successHTTP from "./app/successHTTP.js";
import Addresses from "./app/Addresses.js";
import getMessageAndSuccess from "./app/getMessageAndSuccess.js";
import checkPermission from "./app/checkPermission.js";
import checkAdminPermission from "./app/checkAdminPermission.js";
import ProductCategories from "./app/ProductCategories.js";

const app = express();

app.set("view engine", "ejs");
app.use(expressEjsLayouts);
app.use(urlencoded({extended: true}));
app.use(express.static("assets"));

app.use(session());

app.use(session({
    secret: "asdf",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24*60*60*1000
    }
}));

const uh = new UserHandler();
const p = new Profile(); 
const a = new Addresses();
const pc = new ProductCategories();
const pr = new Products();

app.get("/", (req, res)=> {
    res.render("public/index", 
        {
            layout: "layouts/public_layout", 
            title: "Kezdőlap", 
            baseUrl: process.env.BASE_URL,
            page:"index",
            message:req.query.message ? req.query.message : ""
        }
    );
});

app.post("/regisztracio", async (req, res)=> {
    let response;
    try {
        response = await uh.register(req.body); 
    } catch (err) {
        response = err;
    }

    //response.success = response.status.toString(0) === "2";
    response.success = successHTTP(response.status);
    res.status(response.status);

    res.render("public/register_post", {
        layout: "./layout/public_layout",
        message: response.message,
        title: "Regisztráció",
        baseUrl: process.env.BASE_URL,
        page: "regisztracio", 
        success: response.success
    })
});

app.post("/login", async (req, res)=> {
    let response;
    let path;

    try{
        response = uh.login(req.body);
        req.session.userName = response.message.userName;
        req.session.userID = response.message.userID;
        req.session.isAdmin = response.message.isAdmin;

        path = response.message.isAdmin == 0 ? "/user/profil" : "/admin/profil"
    } catch(err) {
        response = err;
    }

    response.success = successHTTP(response.status);


    res.status(response.status).redirect(
        response.success ? path : `/bejelentkezes?message=${response.message[0]}`
    )

})

app.get("/bejelentkezes", (req, res)=> {
    res.render("public/login", {
        layout: "./layouts/public_layout",
        title: "Bejelentkezés",
        baseUrl: process.env.BASE_URL,
        page: "bejelentkezes",
        message: req.query.message ? req.query.message : ""
    })
});

app.get("/user/profil", async (req, res)=> {
    try {
        checkPermission(req.session.userID);
        const profileData = await p.getProfile(req.session.userID);
        //const messages = req.query.messages.split(",");
        /*
            Mert a getProfile függvény vár egy id-t és az alapján lehozza az összes (*) adatot, ahhoz az id-ű rekordhoz 
        */
        //csináltunk egy segédfüggvényt
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("user/profile", {
            layout: "./layouts/user_layout",
            title: "Profil Szerkesztése",
            baseUrl: process.env.BASE_URL,
            profileData: profileData.message, //itt meg megszerezzük az összes mezőt az adatbázisból 
            page: "profil", 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.post("/user/profil", async (req, res)=> {
    let response;

    try {
        const user = req.body;
        user.userID = req.session.userID;
        response = await p.updateProfile(user);
    } catch(err) {
        response = err;
    }

    console.log(response);

        
    const success = successHTTP(response.status);
    res.redirect(`/user/profil?success=${success}&messages=${response.message}`);
});

app.get("/user/cim-letrehozasa", async (req, res)=> {
    try {
        checkPermission(req.session.userID);
        const addressTypes = await a.getAddressTypes();
        const messageAndSuccess = getMessageAndSuccess(req.query);
    
        res.render("user/create_address", {
            layout: "./layouts/user_layout", 
            title: "Címek létrehozása", 
            page: "címek",
            addressTypes: addressTypes,
            baseUrl: process.env.BASE_URL,
            message: messageAndSuccess.message,
            success: messageAndSuccess.success,
            address:{}
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    } 
   
});

app.post("/user/create_address", async (req, res)=> {
    //itt szedjük majd le az adatokat 
    let response;

    try {
        response = await a.createAddress(req.body, req.session.userID);
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.status);

    if(success) {
        res.status(response.status).redirect(`/user/cim-letrehozasa/${response.insertID}?message=${response.message}&success=${success}`);
    } else {
        res.status(response.status).redirect(`/user/cim-letrehozasa?message=${response.message}&success=${success}`);
    }
    
});

app.get("/user/cim-letrehozasa:addressID", async (req, res)=> {
    try {
        checkPermission(req.session.userID);
        const addressTypes = await a.getAddressTypes();
        const messageAndSuccess = getMessageAndSuccess(req.query);
        const address = await a.getAddressByID(req.params.addressID, req.session.userID);
        console.log(address);
    
        res.render("user/create_address", {
            layout: "./layouts/user_layout", 
            title: "Címek létrehozása", 
            baseUrl: process.env.BASE_URL,
            page: "címek",
            addressTypes: addressTypes,
            message: messageAndSuccess.message,
            success: messageAndSuccess.success,
            address:address
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    } 
});

app.post()

app.get("/user/címek", async (req, res)=> {
    let response;

    try {
        checkPermission(req.session.userID),
        response = await a.getAddressesByUser(req.session.userID);
    } catch(err) {
        if(err.status === 403) {
            res.redirect(`/message=${err.message}`);
        }
        response = err;
    }

    res.render("user/addresses", { 
        layout: ".layout/user_layout",
        addresses: response.message,
        baseUrl: process.env.BASE_URL,
        title: "Címek", 
        page: "címek"
    })
});

app.post("user/create-address/:addressID", async (req, res)=> {
    let response;

    try {
        const address = req.body;
        address.addressID = req.params.addressID;
        response = await a.updateAddress(address, req.session.userID);
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    res.redirect(`/user/cim-letrehozasa/${req.params.addressID}?message=${response.message}&success=${success}`);
    /*
        fontos, hogy azokat ami egy url változó query, azt ?xx=xx formátumba kell csinálni   
    */
})

app.get("/admin/profil", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );
        const profileData = await p.getProfile(req.session.userID);
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("admin/profile", {
            layout: "./layouts/admin_layout",
            title: "Profil Szerkesztése",
            baseUrl: process.env.BASE_URL,
            profileData: profileData.message, //itt meg megszerezzük az összes mezőt az adatbázisból 
            page: "profil", 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.get("/admin/felhasznalok", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );

        const users = await uh.search(
            req.session.userID,
            req.session.isAdmin
        )
        
        res.render("admin/users", {
            layout: "./layouts/admin_layout",
            title: "Felhasználok",
            baseUrl: process.env.BASE_URL,
            profileData: users.message,
            page: "felhasznalok", 
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.get("/admin/termek-kategoriak", async (req, res)=> {
    try {
        // checkAdminPermission(
        //     req.session.userID,
        //     req.session.isAdmin
        // );

        const categories = await pc.getProductCategories(
            // req.session.userID,
            // req.session.isAdmin
        )
        
        res.render("admin/product-categories", {
            layout: "./layouts/admin_layout",
            title: "Termék kategóriák",
            baseUrl: process.env.BASE_URL,
            categories: categories,
            page: "termek-kategoriak"
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.get("/admin/termek-kategoria", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );

        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("admin/product-category", {
            layout: "./layouts/admin_layout",
            title: "Termék kategória",
            baseUrl: process.env.BASE_URL,
            page: "termek-kategoria", 
            categoryData: null,
            message: messageAndSuccess.message,
            success: messageAndSuccess.success
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.post("admin/create-category", async (req, res)=> {
    let response;

    try {
        response = await pc.createCategory(
            req.body,
            req.session.userID,
            req.session.isAdmin
        )
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    if(success) {
        res.redirect(`/admin/termek-kategoria/${response.insertID}?message=${response.message}&success=${success}`);
    } else {
        res.redirect(`/admin/termek-kategoria/?message=${response.message}&success=${success}`);
    }
});

app.get("/admin/termek-kategoria/:categoryID", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );

        const categoryData = await pc.getCategoryByID(req.params.categoryID);
        /*
            fontos, hogy itt ha response [0][0], akkor azt az egyet kapjuk meg, ami nekünk kell 
            async getCategoryByID(categoryID) {
                 try {
                    const response = await conn.promise().query(
                    "SELECT * FROM product_categories WHERE categoryID = ?"
                    [categoryID]
                    );
                return response[0][0];                        *****
        */

        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("admin/product-category", {
            layout: "./layouts/admin_layout",
            title: "Termék kategória",
            baseUrl: process.env.BASE_URL,
            page: "termek-kategoria", 
            categoryData:categoryData, 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.post("admin/create-category/:categoryID", async (req, res)=> {
    let response;

    try {

        const categoryData = req.body;
        categoryData.categoryID = req.params.categoryID;
        response = await pc.updateCategory(
            categoryData,
            req.session.userID,
            req.session.isAdmin
        )
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    // if(success) {
    //     res.redirect(`/admin/termek-kategoria/${response.insertID}?message=${response.message}&success=${success}`);
    // } else {
    //     res.redirect(`/admin/termek-kategoria/?message=${response.message}&success=${success}`);
    // }
    //itt nem úgy fogunk eljárni, mert nem response.insertID, hanem req.params.category, ahonnan meg van a szám!! 

    res.redirect(`/admin/termek-kategoria/${req.params.categoryID}/?message=${response.message}&success=${success}`);
});

app.post("/admin/delete-category/:categoryID", async (req, res)=> {
    let response;

    try {
        response = await pc.deleteCategory(
            req.params.categoryID,
            req.session.userID,
            req.session.isAdmin
        );
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    res.redirect(`/admin/termek-kategoriak/?message=${response.message}&success=${success}`);
});

//fontos, hogy nincsen még példányunk a Product-ból -> const pr = new Products();
app.get("/admin/termek", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );
    
        /*
            Itt nekünk kell a productCategory
            Ez nagyon fontos, mert ha nincs itt productCategory, akkor nem tudjuk kiválasztani a termék kategóriákat, ilyen legördülősben 
            -> 
        */
        const categories = await pc.getProductCategories()
        /*
            majd amit itt megkapunk termék kategóriákat, azokat át kell adni a render-nek, mert ott majd egy forEach-vel végig kell menni rajtuk!!
        */
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("admin/product", {
            layout: "./layouts/admin_layout",
            title: "Termék létrehozása",
            baseUrl: process.env.BASE_URL,
            page: "termek", 
            categories: categories,           //***
            message: messageAndSuccess.message,
            success: messageAndSuccess.success,
            productData: null         
        })
    } catch(err) {
        console.log(err);
        res.redirect(`/?message=${err.message}`);
    }
});

app.post("/admin/create-product", async (req, res)=> {
    let response;

    try {
        response = await pr.createProduct(
            req.body,
            req.session.userID,
            req.session.isAdmin
        );
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    if(success) {
        res.redirect(`/admin/termek/${response.insertID}?message=${response.message}&success=${success}`);
    } else {
        res.redirect(`/admin/termek?message=${response.message}&success=${success}`);
    }
});

app.get("/admin/termek/:productID", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );

        const categories = await pc.getProductCategories()
        const messageAndSuccess = getMessageAndSuccess(req.query);
        const productData = await pr.getProductByID(req.params.productID);

        res.render("admin/product", {
            layout: "./layouts/admin_layout",
            title: "Termék létrehozása",
            baseUrl: process.env.BASE_URL,
            page: "termek", 
            categories: categories, 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success, 
            productData: productData          
        })
    } catch(err) {
        console.log(err);
        res.redirect(`/?message=${err.message}`);
    }
});

app.post("/admin/create-product/:productID", async (req, res)=> {
    let response;

    try {
        req.body.productID = req.params.productID;
        //hogy a body-ban legyen benne a productID is! 
        response = await pr.updateProduct(
            req.body,
            req.session.userID,
            req.session.isAdmin
        );
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    res.redirect(`/admin/termek/${req.params.productID}?message=${response.message}&success=${success}`);
});

app.get("/admin/termekek", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );
    
        const products = await pr.getProducts();
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("admin/products", {
            layout: "./layouts/admin_layout",
            title: "Termékek",
            baseUrl: process.env.BASE_URL,
            page: "termekek",            
            message: messageAndSuccess.message,
            success: messageAndSuccess.success,
            products: products    
        })
    } catch(err) {
        console.log(err);
        res.redirect(`/?message=${err.message}`);
    }
});

app.listen(3000, console.log("the app is listening on localhost:3000"));

/*
    Még nem hozzuk le a termekek-et, tehát ez még nem létezik, hogy /termekek 
    Csak ilyen, hogy localhost:3000/admin/termek
    Ahol fel tudunk vinni egy terméket 

    Van egy ilyen, hogy /admin/create-product
    És a prodcuts.ejs-ben a post ide kell, hogy átírányítson minket 
    ->
    <form method="POST" class="box" action="<%=baseUrl%/admin/create-product>">
    És fontos, hogy a get-es kérésnél kell adni neki egy baseUrl-t, hogy ezt ide be tudjuk hívni 
    ->
    render-nél 
    baseUrl: process.env.BASE_URL,

    Létre tudtunk hozni terméket de még csak az van a redirect-ben, hogy ide írányítson minket át 
    res.redirect(`/admin/termek`);
    tehát ott marad, amikor felvitük a terméket 
    Csak ilyenkor már az update-re kell, hogy átírányíton minket  
    -> 
        const success = successHTTP(response.success);
    if(success) {
        res.redirect(`/admin/termek/${response.insertID}?message=${response.message}&success=${success}`);
    } else {
        res.redirect(`/admin/termek?message=${response.message}&success=${success}`);
    }
    Tehát ha minden rendben volt success, akkor átírányítunk oda, hogy response.insertID (termek/1, attól függően, hogy mi volt az insertID)
    ha meg nem akkor itt maradunk a termek-en és mindkét esetben kiírjuk a message-t meg a success-t 

    Csak nincsen nekünk olyan endpointunk, hogy /productID, ahhova át akarunk írányítani, ha sikeres volt a felvitel (csinálunk egy ilyen get-et)
    -> 
    app.get("/admin/termek/:productID", async (req, res)=> {

    Most nézünk egyet amit direkt elrontunk és nem írunk be semmit úgy küldjük be 
    ->
    Az url-ben ki van írva hibaüzenet -> res.redirect(`/admin/termek?message=${response.message}&success=${success}`);
    de viszont az oldalra nincsen

    Ezért kell nekünk, hogy ami a /profil-on (profile.ejs) van, hogy végigmegyünk a message-n és kiírjuk 
    ezt megcsináljuk a container-ben, de viszont a form-on kivül a product.ejs-ben 
    <div class="container">
    <% message.forEach((m)=> {%>
        <h4 class="<%=success ? 'color-success' : 'color-error'%>">
            <%=m%>
        </h4>
    <% }); %>

    És fontos, hogy ezt meg kell csinálni a termékkategóriáknál is, mert ha /admin/termek-kategoria-án beküldjük az ottani form-ot 
    akkor hasonlóan, mint itt benne lesz az url-ben de viszont nem írja ki az oldalra!!! 
    Ott is megcsináltuk (product-category.ejs) úgy mint itt a product.ejs-ben meg ahogy a profile-on volt 

    de hogy ezt ki is írja át kell adni ugye a message-t meg a success-t 
    -> 
    és kell majd ez
    const messageAndSuccess = getMessageAndSuccess(req.query);  ************************
    ez ebből a segédfüggvényből ered 
    ->
    function getMessageAndSuccess(query) {
    return {
        message: query.message ? query.message.split(",") : [],
        success: query.success ? query.success === "true": true
    }
    meg kell ez is, hogy a render-ben átadjuk 
        res.render("admin/profile", {
        layout: "./layouts/admin_layout",
        title: "Profil Szerkesztése",
        baseUrl: process.env.BASE_URL,
        profileData: profileData.message, //itt meg megszerezzük az összes mezőt az adatbázisból 
        page: "profil", 
        message: messageAndSuccess.message,         *****************************
        success: messageAndSuccess.success          *****************************

    És ami be van jelölve, tehát const messageAndSuccess = getMessageAndSuccess(req.query); meg ezeknek message: messageAndSuccess.message, 
    ott kell lenni ezeknél 
    -> app.get("/admin/termek-kategoria", async (req, res)=> {
    És így ezen fogjuk felvinni a termék kategóriákat és ha üresen beküldjük, akkor most már kiírja a hibákat!! 

    -> app.get("/admin/termek-kategoria/:categoryID", async (req, res)=> {
    Itt meg update-lni tudjuk a kategóriákat és ide is kellenek ugyanezek 

    Meg szinten a termek-nél is mindkettőre, ahol csináljuk meg ahol update-eljük!! 
        app.get("/admin/termek", async (req, res)=> {
        app.get("/admin/termek/:productID", async (req, res)=> {

    Most már a termék felvitelnél és update-nél is kiírja, hogyha valamelyik mezőt üresen hagytuk 

    Ha meg jól vittük fel akkor kiírja most ezt 
    localhost:3000/undefined?message=Sikeres%20felvitel!%20&success=true 

    és itt ahol átírányít minket -> app.post("/admin/create-product", async (req, res)=> {
    erre, hogy -> res.redirect(`/admin/termek/${response.insertID}?message=${response.message}&success=${success}`);

    Itt nincsen indertID!! 

    És a Products.createProduct-ban ezt át kell majd adni 
        try {
            const response = await conn.promise().query(`
            INSERT INTO products (title, productName, productDesc, price, discountPrice)
            VALUES(?,?,?,?,?)`,
            [product.title, product.productName, product.productDesc, product.price, product.discountPrice]
            );

            if(response[0].affectedRows === 1) {
                return {
                    status: 200,
                    message: ["Sikeres létrehozás!"],
                    insertID: response[0].insertId           ************************

    És így már úgy tud minket átírányítani (res.redirect(`/admin/termek/${response.insertID}..), hogy nem az undefined-re
    hanem arra, hogy /1 vagy 2 vagy ilyesmi

    Most ha /admin/termek-en kitöltjük a mezőket és a post-os ide visz minket (redirect-el) minket 
    ->
    localhost:3000/admin/termek/3?message=Sikeres%20létrehozás!%20&success=true
    Ez edig jó csak most jelenleg ha beküldjük akkor kiürülnek a mezők és nem marad ott amit felvittünk!! 
    Ilyenkor az id alapján le kell szedni az adatbázisból az adatokat és megjeleníteni

    És ami még baj, hogy a productCategory az mindenhol NULL, mert nem is raktuk be Products.createProduct-ba!!! 
    ->
    const response = await conn.promise().query(`
        INSERT INTO products (title, productCategory***, productName, productDesc, price, discountPrice)
        VALUES(?,?,?,?,?,?)`,
        [product.title, product.productCategory***, product.productName, product.productDesc, product.price, product.discountPrice]
        );

    És így már fel tudunk vinni minden olyan mezőnek értéket, amilyen mezőink vannak az sql-en 
    de még az sql-en a productCategory az egy 0 (most már nem NULL) de még mindig nem jó, mert a 0 az válasz kategóriát 
    tehát ezt kell átírni
    ->
        <select name="productCategory">
            <option value="0">Válassz kategóriát</option>
            <% categories.forEach((c)=> { %>
                <option><%=c.categoryName%></option>
            <% })%>
        </select>

    Meg kell adni a value-t azoknak az option-öknek is, amik a forEach-en belül vannak 
            <select name="productCategory">
            <option value="0">Válassz kategóriát</option>
            <% categories.forEach((c)=> { %>
                <option ****value="<%=c.categoryID%>"><%=c.categoryName%></option>
            <% })%>
        </select>

    Meg az kell nekünk, hogyha volt valami error, akkor írányitson át minket a kezdőoldalra
    ami itt is van a app.get("/admin/termek-kategoria/:categoryID"
    ->
    } catch(err) {
        res.redirect(`/?message=${err.message}`); ********
    }   

    És ezt be kell rakni mindkét get-es termékeshez 
        app.get("/admin/termek", async (req, res)=> {
        app.get("/admin/termek/:productID", async (req, res)=> {

    Ha sikeresen létrehozunk terméket, akkor már a productCategory már jó nem null vagy 0 
    Ez innen jön ugye (value="<%=c.categoryID%), tehát ez egy szám lesz 1-2-3 stb. 

    Kell nekünk egy getProductByID, ami az id alapján leszedi a termékadatokat (Products.js)

    Ha ez meg van, akkor be kell hívni ide app.get("/admin/termek/:productID", async (req, res)=> {
        tehát itt behíívjuk a függvényt -> const productData = await pr.getProductByID(req.params.productID);

    és ami fontos, hogy nem csak a /admin/termek/:productID" hanem a /admin/termek-be is meg kell adni render-ben 
    a ProductData-t, de ez majd az admin/termek-ben null-ás értéket fog kapni!!!!!!! 
    app.get("/admin/termek/:productID", async (req, res)=> {
            res.render("admin/product", {
                .... 
            productData: productData          
        })

    app.get("/admin/termek", async (req, res)=> {
            res.render("admin/product", {
                .... 
            productData: null

    És majd le kell ellenőrizni, hogy ez null-e vagy sem a product.ejs-en!!
        <h3>Termék kategória</h3>
        <select name="productCategory">
            <option value="0">Válassz kategóriát</option>
            <% categories.forEach((c)=> { %>
                <option value="<%=c.categoryID%>"><%=c.categoryName%></option>
            <% })%>
        </select>

    Még ez fontos, hogy ez hogyan legyen kijelölve, hogy az adott terméknek a kategóriája, ami már meg van nyitva! 
    -> 
            <select name="productCategory">
            <option value="0">Válassz kategóriát</option>
            <% categories.forEach((c)=> { %>
                <option **** <%= productData && productData.productCategory == c.categoryID ? "selected" : '' %>   ************
                value="<%=c.categoryID%>"><%=c.categoryName%></option>
            <% })%>
        </select>
    Ha létezik a productData és a productData.categoryID az egyenlő a c.categoryID-val akkor kap egy selected-et különben meg egy üres string
    
    Tehát ha megszereztük az async getProductByID(productID)-vel az adatokat, amiket itt return-ölünk -> return response[0][0]
    ezt behívjuk itt (/admin/termek/:productID") -> const productData = await pr.getProductByID(req.params.productID)
    és ugyanitt a render-ben át kell adni a productData-t (productData: productData) 
    hogy amelyik page-t render-eltük (admin/product, tehát a product.ejs) ott majd be lehessen hívni és megadni minden mezőnek 
    egy VALUE-ban, hogy ki legyen írva az érték amit leszedtünk!!!!!!!!!!!!!!!!!!!!!
    ->
        <option value="0">Válassz kategóriát</option>
            <% categories.forEach((c)=> { %>
                <option <%= productData && productData.productCategory == c.categoryID ? "selected" : '' %>
                value="<%=c.categoryID%>"><%=c.categoryName%></option>
            <% })%>
        </select>

        <h3>Termék cím</h3>
        <input type="text" 
        value="<%= productData ? productData.title : ''>"
        name="title">

        <h3>Termék név</h3>
        <input type="text" 
        value="<%= productData ? productData.productName : ''>"
        name="productName"> 

    De ugye csak abban az esetben, hogyha létezik a productData, mert a sima (ahol elöször visszük fel a terméket) /admin/termek 
    ott is átadunk a render-nek egy ilyet, hogy productData de ennek az értéke az null lesz -> productData: null
    ->
    És így már ki vannak töltve a mezők ha arra megyünk, hogy localhost:3000/admin/termek/2 (ha létezik ilyen id-jű termék, hogy 2-es)

    Még a product.ejs-en az action-be ezt meg kell csinálni -> 
    <form method="POST" class="box" action="<%=baseUrl%/admin/create-product/<%= productData ? productData.productID : ''>">
    Tehát ha létezik a productData, akkor oda megyünk, hogy hozzácsatoljuk a admin/create-product-hoz a productID-t!!!! 

        async getProductByID(productID) {
            if(nan(productID)) {
                throw {
                    status: 400,
                    message: ["Nem megfelelő termékazonosító"]
                }
            }
    
            try {
                const response = await conn.promise().query("SELECT * FROM products WHERE productID = ?", 
                [productID])
    
                if(response[0].length > 0) {
                    return response[0][0];
                } else {
                    throw {
                        status: 404,
                        message: ["A termék nem található!"]
                    }
                }

    Most kell majd megoldani a felülírást, csináltuk a createProduct-ot a termék elkészítéséhez 
    Most meg csinálunk egy updateProduct-ot a felülíráshoz (Products.js)
    
        async updateProduct(product, userID, isAdmin) {
        checkAdminPermission(userID, isAdmin);
        const errors = this.checkData(product);

        if(errors.length > 0) {
            throw {
                status: 400,
                message: errors
            }
        try {
            const response = await conn.promise().query(`
            UPDATE products SET productCategory = ?,
            title = ?, productName = ?, productDesc = ?, price = ?, discountPrice = ?, updated = ?
            WHERE productID = ?`,
            [product.productCategory, product.title, product.productName, getMySqlDate(new Date) *******************,
            product.price, product.discountPrice, product.productID]
        ......

    megcsináljuk az updated-et, az sql vár gey formátumot, hogy 2024-10-03 10:31:08 és egy date objektumot kell majd átalakítanunk ilyenné 
    getMySqlDate.js 

    Ez ami fontos, hogy itt bekérünk egy new Date()-et és ezt a getMySqlDate-ben megcsináljuk olyan formában, hogy jó legyen az sql-nek 
    -> 
    function getMySqlDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hour = date.getHours().toString().padStart(2, "0");
    const minute = date.getMinutes().toString().padStart(2, "0");
    const second = date.getSeconds().toString().padStart(2, "0");

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

Most meg van az updateProduct-os fügvény és ennek kell megcsinálni az endpointot 
az nagyon hasonló lesz, mint az endpoint amit a createProduct-nak csináltunk 

De viszont itt lesz egy productID -> app.post("/admin/create-product/:productID", async (req, res)=> {
-> 
app.post("/admin/create-product/:productID", async (req, res)=> {
    let response;

    try {
        req.body.productID = req.params.productID;       ****************
        //hogy a body-ban legyen benne a productID is! 
        response = await pr.updateProduct( *** itt az updateProduct-ot meghívjuk 
            req.body,
            req.session.userID,
            req.session.isAdmin
        );
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    res.redirect(`/admin/termek/${req.params.productID}?message=${response.message}&success=${success}`); **************
    itt meg majd /req.params.productID-ra írányítunk át!!!!! 
});

És így már felül tudunk írni, mert ha ide megyünk, hogy /admin/termek/2 mondjuk és felülírjuk és beküldjük 
akkor megmarad az új dolog amit megadtunk és ez lesz kiírva az url-be 
localhost:3000/admin/termek/2?message=Sikeres%20felülírás!%20&success=true
és ki is írja, hogy Sikeres felülírás!
*****************
Most már csak meg kell csinálni a termékek oldalt, ahol ott lesz az összes termék amit felvittünk 
lesz egy gomb ahol új terméket lehet majd felvinni, meg egy gomb (minden felvitt terméknél), amivel az adott terméket tudjuk felülírni!! 

Ehhez kell egy getProducts a Products.js-en 
    async getProducts() {
        try {
            //itt majd arre kell figyelni, hogy a termékkategóriát ki kell írni szöveggel, mert products-ban a productCategory az 1,2,3 
            és nekünk az kell, hogy product_categories táblából (amivel össze van kötve) a categoryName, hogy parfün, üditő stb.
                const response = await conn.promise().query(`
                    SELECT product.*, product_categories.categoryName
                    FROM products
                    INNER JOIN product_categories
                    ON products.productCategory = product_categories.categoryID`
                    )
        
                    return response[0];
                } catch(err) {

Kell egy olyan get-es endpointot csinálni, hogy admin/termekek
meg kell egy products.ejs, amit majd itt megjelenítünk!! ami nagyon hasonló lesz mint a product_categories.ejs 
products.ejs 
-> 
<div class="container">
<a href="<%= baseUrl%>/admin/termek">
    <button>Létrehozás</button>
</a>

    <div class="grid">
        <% products.forEach(p=> {  %>
            <div class="box">
                <h4>Név</h4>
                <%= p.productName%>

                <h4>Kategória</h4>
                <%= p.categoryName%>



                <a href="<%= BASE_URL%>/admin/termek/<%=p.productID%>">
                    <button>Megnyítás</button>
                </a>

                <form method="post">
                    <button>Törlés</button>
                </form>
            </div>
        <% }) %>
    </div>
</div>

itt fontos, hogy hova megyünk az a-val, amikor terméket viszünk fel 
->
<a href="<%= baseUrl%>/admin/termek">
    <button>Létrehozás</button>
</a>

amikor meg a products forEach-en belül vagyunk ott meg (felülírás)
    <a href="<%= BASE_URL%>/admin/termek/<%=p.productID%>">
        <button>Megnyítás</button>
    </a>

ez meg az endpoint lesz a termekek-nek 
->
app.get("/admin/termekek", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );
    
        const products = await pr.getProducts();   **** itt ezt hívjuk meg ami leszedi az adatbázisból az összes terméket 
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("admin/products", {         ****** itt a products-ot jelenítjük meg nem a product-ot 
            layout: "./layouts/admin_layout",
            title: "Termékek",
            baseUrl: process.env.BASE_URL,
            page: "termekek",            
            message: messageAndSuccess.message,
            success: messageAndSuccess.success,
            products: products                 ****** itt átadjuk a termékeket és azon megyünk végig egy forEach-vel
        })
    } catch(err) {
        console.log(err);
        res.redirect(`/?message=${err.message}`);
    }
});

*/

