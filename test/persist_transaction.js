var chai = require("chai"),
    expect = require('chai').expect,
    fs = require('fs');

var chaiAsPromised = require("chai-as-promised");
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.should();
chai.use(chaiAsPromised);

var Q = require("q");
var _ = require("underscore");
var ObjectTemplate = require('supertype');
var PersistObjectTemplate = require('../index.js')(ObjectTemplate, null, ObjectTemplate);

var knex = require('knex')({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        database: 'persistor_banking',
        user: 'postgres',
        password: 'postgres'
    }
});

var schema = {};
var schemaTable = 'index_schema_history';


describe('persistor transaction checks', function () {
    before('arrange', function (done) {
        (function () {
            PersistObjectTemplate.setDB(knex, PersistObjectTemplate.DB_Knex);
            PersistObjectTemplate.setSchema(schema);
            PersistObjectTemplate.performInjections();

        })();
        return Q.all([
            knex.schema.dropTableIfExists('tx_employee').then(function(){
                return knex.schema.dropTableIfExists('tx_address');
            }),

            knex.schema.dropTableIfExists('tx_employee1').then(function(){
                return knex.schema.dropTableIfExists('tx_address1');
            }),
            knex.schema.dropTableIfExists('tx_employee2').then(function(){
                return knex.schema.dropTableIfExists('tx_address2');
            }),
            knex(schemaTable).del(),
            createFKProcedure()
        ]).should.notify(done);

        function createFKProcedure(){
            var content = fs.readFileSync('test/f_create_ref_integrity.sql', "utf-8");
            return knex.schema.raw(content);
        }
    });

    it("create a simple table", function () {
        schema.Employee = {};
        schema.Address = {};
        schema.Employee.documentOf = "tx_employee";
        schema.Address.documentOf = "tx_address";

        schema.Employee.parents = {
            homeAddress: {id: "department_id"}
        }

        var Address = PersistObjectTemplate.create("Address", {
            city: {type: String},
            state: {type: String}
        });

        var Employee = PersistObjectTemplate.create("Employee", {
            name: {type: String, value: "Test Employee"},
            homeAddress: {type: Address}
        });

        var emp = new Employee();
        var add = new Address();
        add.city = 'New York';
        add.state = 'New York';
        emp.name = 'Ravi';
        emp.homeAddress = add;

        PersistObjectTemplate.performInjections();

        return syncTable(Employee)
            .then(syncTable.bind(this, Address))
            .then(createFKs.bind(this, Address))
            .then(openTransaction.bind(this))
            .then(endTransaction.bind(this))
            

        function transaction(){
            return insertToParent()
                .then(insertToChild.bind(this));
        }

        function createFKs(){
            return knex.raw('select f_create_ref_integrity(\'foreign key for\')' );
        }

        function syncTable(template){
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template);
        }

        function openTransaction() {
            tx =  PersistObjectTemplate.begin();
            tx.knex = knex.transaction(transaction);
            return tx;
        }

        function insertToChild(tx){
            return emp.persistSave(tx).then(function(){
                return tx;
            });
        }
        function insertToParent(tx){
            return add.persistSave(tx).then(function(){
                return tx;
            });
        }
        function endTransaction(tx){
            return PersistObjectTemplate.end(tx);
        }
    });


    it("create a simple table with SaveAll", function () {
        schema.Employee1 = {};
        schema.Address1 = {};
        schema.Employee1.documentOf = "tx_employee1";
        schema.Address1.documentOf = "tx_address1";

        schema.Employee1.parents = {
            homeAddress: {id: "department_id"}
        }

        var Address1 = PersistObjectTemplate.create("Address1", {
            city: {type: String},
            state: {type: String}
        });

        var Employee1 = PersistObjectTemplate.create("Employee1", {
            name: {type: String, value: "Test Employee"},
            homeAddress: {type: Address1}
        });



        PersistObjectTemplate.performInjections();
        PersistObjectTemplate._verifySchema();

        return syncTable(Employee1)
            .then(syncTable.bind(this, Address1))
            .then(createFKs.bind(this, Address1))
            .then(openTransaction.bind(this))
            .then(endTransaction.bind(this));


        function transaction(){
            return insertToParent()
                .then(insertToChild.bind(this));
        }

        function createFKs(){
            return knex.raw('select f_create_ref_integrity(\'foreign key for\')' );
        }

        function syncTable(template){
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template);
        }

        function openTransaction() {
            tx =  PersistObjectTemplate.begin();
            return tx;
        }


        function endTransaction(tx){
            tx =  PersistObjectTemplate.begin();
            var emp = new Employee1();
            var add = new Address1();
            add.city = 'New York';
            add.state = 'New York';
            emp.name = 'Ravi';
            emp.homeAddress = add;

            emp.setDirty();
            add.setDirty();

            return PersistObjectTemplate.saveAll(tx);
        }
    });

    it("create a simple table with setdirty and end operations..", function () {
        schema.Employee2 = {};
        schema.Address2 = {};
        schema.Employee2.documentOf = "tx_employee2";
        schema.Address2.documentOf = "tx_address2";

        schema.Employee2.parents = {
            homeAddress: {id: "department_id"}
        }

        var Address2 = PersistObjectTemplate.create("Address2", {
            city: {type: String},
            state: {type: String}
        });

        var Employee2 = PersistObjectTemplate.create("Employee2", {
            name: {type: String, value: "Test Employee"},
            homeAddress: {type: Address2}
        });



        PersistObjectTemplate.performInjections();
        PersistObjectTemplate._verifySchema();

        return syncTable(Employee2)
            .then(syncTable.bind(this, Address2))
            .then(createFKs.bind(this, Address2))
            .then(openTransaction.bind(this))
            .then(endTransaction.bind(this));


        function transaction(){
            return insertToParent()
                .then(insertToChild.bind(this));
        }

        function createFKs(){
            return knex.raw('select f_create_ref_integrity(\'foreign key for\')' );
        }

        function syncTable(template){
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template);
        }

        function openTransaction() {
            tx =  PersistObjectTemplate.begin();
            return tx;
        }


        function endTransaction(tx){
            var emp = new Employee2();
            var add = new Address2();
            add.city = 'New York';
            add.state = 'New York';
            emp.name = 'Ravi';
            emp.homeAddress = add;
            add.setDirty();
            emp.setDirty();


            return PersistObjectTemplate.end(tx);
        }
    });

});
