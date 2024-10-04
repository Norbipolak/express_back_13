import conn from "./conn.js";
import checkAdminPermission from "./checkAdminPermission.js";
import nullOrUndefined from "./nullOrUndefined.js";
import trim from "./trim.js";
import nan from "./nan.js";
import getMySqlDate from "./getMySqlDate.js";
//Ezeket be kell importálni, amikor megcsináltuk a class-t, mert be lesznek ezzel hívva

class Products {
    checkData(product) {
        const errors = [];
        //itt ezt meghívhatjuk, mert akkor nem kell több helyen és ami bejön majd objektum azoknak az értékei trim()-elve lesznek 
        trim(product);

        if (nullOrUndefined(product.title) || product.title.length < 2) {
            errors.push("A címnek legalább 2 karakteresnek kell lennie!");
        }

        if (nullOrUndefined(product.productName) || product.productName.length < 2) {
            errors.push("A terméknévnek legalább 2 karakteresnek kell lennie!");
        }

        if (nullOrUndefined(product.productCategory) || product.productCategory.length === 0) {
            errors.push("A termékkategóriát kötelező kivélasztani!");
        }

        //description az ne legyen üres 
        if (nullOrUndefined(product.productDesc) || product.productDesc.length === 0) {
            errors.push("A leírás mező nem maradhat üres!");
        }

        //mert lehet az ár nulla is 
        if (nullOrUndefined(product.price) || product.price > 0) {
            errors.push("Az ár mező nem maradhat üres és nem lehet nullánál kisebb!");
        }

        /*
            A discountPrice nem lehet null vagy undefined, mert hogyha beküldjük a form-ot, akkor kell, hogy legyen 
            egy olyan mező, hogy discountPrice
            Viszont ha meg üres, akkor nem akartuk a terméknek discountPrice-t adni 
        */
        if (nullOrUndefined(product.discountPrice || product.discountPrice > 0)) {
            errors.push("A diszkont árat be kell állítani (Ha nulla, akkor nincs)!");
        }

        return errors;

    }

    async createProduct(product, userID, isAdmin) {
        checkAdminPermission(userID, isAdmin);
        const errors = this.checkData(product);

        if(errors.length > 0) {
            throw {
                status: 400,
                message: errors
            }
        }

        try {
            const response = await conn.promise().query(`
            INSERT INTO products (title, productCategory, productName, productDesc, price, discountPrice)
            VALUES(?,?,?,?,?,?)`,
            [product.title, product.productCategory, product.productName, product.productDesc, product.price, product.discountPrice]
            );

            if(response[0].affectedRows === 1) {
                return {
                    status: 200,
                    message: ["Sikeres létrehozás!"],
                    insertID: response[0].insertId
                }
            } else {
                throw {
                    status: 503, 
                    message: ["A szolgáltatás ideiglenesen nem érhető el!"]
                }
            }
            
        } catch(err) {
            console.log("Products.createProduct", err);

            if (err.status) {
                throw err;
            }

            throw {
                status: 503,
                message: ["A szolgáltatás jelenleg nem érhető el!"]
            }
        }
    }

    async getProductByID(productID) {
        /*
            Ide nem kell userID meg isAdmin, mert ez egy publikus felületen is meg fog jelenni, elég csak a productID-t bekérni
        */
       /*
            Azt kell megnézni, hogy a productID egy szám-e, amit itt megkapunk, mert ha ez nem szám, akkor az problémát jelenthet 
            function nan(num) {
                return isNaN(parseInt(num))
            }
            tehát parseInt-elni kell a productID, amit itt megkapunk és utána megnézni az isNaN()-val, hogy az szám-e 
            fontos, hogy ezt használni akarjuk, akkor be kell importálni (import nan from "./nan.js";)
            a nan.js-en meg fontos, hogy export default nan;
       */ 
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
        } catch(err) {
            console.log("Products.getProductByID", err);

            if (err.status) {
                throw err;
            }

            throw {
                status: 503,
                message: ["A termék lekérdezése szolgáltatás jelenleg nem érhető el!"]
            }
        }
    }

    async updateProduct(product, userID, isAdmin) {
        checkAdminPermission(userID, isAdmin);
        const errors = this.checkData(product);

        if(errors.length > 0) {
            throw {
                status: 400,
                message: errors
            }
        }

        try {
            const response = await conn.promise().query(`
            UPDATE products SET productCategory = ?,
            title = ?, productName = ?, productDesc = ?, price = ?, discountPrice = ?, updated = ?
            WHERE productID = ?`,
            [product.productCategory, product.title, product.productName, getMySqlDate(new Date),
            product.price, product.discountPrice, product.productID]

        );

        if(response[0].affectedRows === 1) {
            return {
                status: 200,
                message: ["Sikeres felülírás!"]
            }
        } else {
            throw {
                status: 404, 
                message: ["A termék nem található!"] 
            }
        }
        } catch(err) {
            console.log("Products.updateProduct", err);

            if (err.status) {
                throw err;
            }

            throw {
                status: 503,
                message: ["A termék lekérdezése szolgáltatás jelenleg nem érhető el!"]
            }
        }
    }

    async getProducts() {
        try {
            /*
                itt majd arre kell figyelni, hogy a termékkategóriát ki kell írni szöveggel
            */
            const response = await conn.promise().query(`
            SELECT product.*, product_categories.categoryName
            FROM products
            INNER JOIN product_categories
            ON products.productCategory = product_categories.categoryID`
            )

            return response[0];
        } catch(err) {
            console.log("Products.getProducts", err);

            if (err.status) {
                throw err;
            }

            throw {
                status: 503,
                message: ["A termék lekérdezése szolgáltatás jelenleg nem érhető el!"]
            }
        }
    }
}


export default Products;