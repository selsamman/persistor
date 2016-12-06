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
            knex.schema.dropTableIfExists('tx_delete_employee').then(function(){
                return knex.schema.dropTableIfExists('tx_delete_address');
            }),
            knex(schemaTable).del()
        ]).should.notify(done);

     });

    it("create a simple table", function () {
        schema.Employee = {};
        schema.Address = {};
        schema.Employee.documentOf = "tx_employee";
        schema.Address.documentOf = "tx_address";

        schema.Employee.parents = {
            homeAddress: {id: "address_id"}
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
            return knex.raw('ALTER TABLE public.tx_employee ADD CONSTRAINT fk_tx_employee_address2 FOREIGN KEY (address_id) references public.tx_address("_id")' );
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
            homeAddress: {id: "address_id"}
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
            return knex.raw('ALTER TABLE public.tx_employee1 ADD CONSTRAINT fk_tx_employee1_address2 FOREIGN KEY (address_id) references public.tx_address1("_id") deferrable initially deferred' );
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
            emp.setDirty(tx);
            add.setDirty(tx);

            tx.postSave = function (tx) {
                console.log('post save..');
            };

            return PersistObjectTemplate.saveAll(tx);
        }
    });

    it("create a simple table with setdirty and end operations..", function () {
        schema.Employee2 = {};
        schema.Address2 = {};
        schema.Employee2.documentOf = "tx_employee2";
        schema.Address2.documentOf = "tx_address2";

        schema.Employee2.parents = {
            homeAddress: {id: "address_id"}
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
            return knex.raw('ALTER TABLE public.tx_employee2 ADD CONSTRAINT fk_tx_employee2_address2 FOREIGN KEY (address_id) references public.tx_address2("_id") deferrable initially deferred' );
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
            emp.setDirty(tx);
            add.setDirty(tx);
            return PersistObjectTemplate.end(tx);
        }
    });

    it("checking delete scenario", function () {
        schema.EmployeeDel = {};
        schema.AddressDel = {};
        schema.EmployeeDel.documentOf = "tx_delete_employee";
        schema.AddressDel.documentOf = "tx_delete_address";

        schema.EmployeeDel.parents = {
            homeAddress: {id: "address_id"}
        }

        var AddressDel = PersistObjectTemplate.create("AddressDel", {
            city: {type: String},
            state: {type: String}
        });

        var EmployeeDel = PersistObjectTemplate.create("EmployeeDel", {
            name: {type: String, value: "Test Del Employee"},
            homeAddress: {type: AddressDel}
        });

        var emp = new EmployeeDel();
        var add = new AddressDel();
        add.city = 'New York';
        add.state = 'New York';
        emp.name = 'Kumar';
        emp.homeAddress = add;

        PersistObjectTemplate.performInjections();
        PersistObjectTemplate._verifySchema();

        return syncTable(EmployeeDel)
            .then(syncTable.bind(this, AddressDel))
            .then(createFKs.bind(this))
            .then(openTransaction.bind(this))
            .then(endTransaction.bind(this))
            .then(deleteCheck.bind(this))




        function createFKs(){
            return knex.raw('ALTER TABLE public.tx_delete_employee ADD CONSTRAINT fk_tx_delete_employee_address2 FOREIGN KEY (address_id) references public.tx_delete_address("_id") deferrable initially deferred' );
        }

        function syncTable(template){
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template);
        }

        function openTransaction() {
            tx =  PersistObjectTemplate.begin();
            return tx;
        }

        function insertToChild(tx){
            return emp.persistSave(tx).then(function(){
                return tx;
            });
        }
        function insertToParent(txn){
            return add.persistSave(txn).then(function(){
                return txn;
            });
        }
        function endTransaction(txn){
            emp.setDirty(tx);
            add.setDirty(tx);
            return PersistObjectTemplate.end(tx);
        }
        function deleteCheck(txn) {
            //return EmployeeDel.deleteFromPersistWithQuery({name: {$eq: 'Kumar'}});
            return EmployeeDel.deleteFromPersistWithQuery({name: 'Kumar'});
        }
    });
});
