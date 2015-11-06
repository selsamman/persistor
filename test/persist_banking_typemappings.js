/**
 * Created by RSagiraji on 10/29/15.
 */

var chai = require("chai");
var expect = require('chai').expect;

var chaiAsPromised = require("chai-as-promised");
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.should();
chai.use(chaiAsPromised);

var Q = require("q");
var _ = require("underscore");
var ObjectTemplate = require('supertype');
var PersistObjectTemplate = require('../index.js')(ObjectTemplate, null, ObjectTemplate);
var knex = require("knex");


//var Employee = PersistObjectTemplate.create("Employee", {
//    Id: { type: Number,value: 1},
//    Name: {type: String, value: "Ravi"},
//    dob:    {type: Date},
//    isCheck: {type: Boolean},
//    newField: {type: String},
//    newBool: {type: Boolean},
//    newCheck: {type: String},
//    oneMore: {type: String},
//    repeat:{type:String},
//    init: function (id, name){
//        this.Id = id;
//        this.Name = name;
//        this.setDirty();
//        this.dob = new Date();
//        this.isCheck = true;
//    }
//
//})

var Employee = PersistObjectTemplate.create("Employee", {
    id: { type: Number},
    name: { type: String, value: "Test Employee"},
    newField: { type: String, value: "Test Employee", customField: "customValue"},
    init: function(id, name){
        this.id = id;
        this.name = name;
    }
})


Manager = Employee.extend("Manager", {
    init: function () {
        this.id = 12312;
        this.name ="Manager";
        Employee.call(this);
    },
    dob: {type: Date, value: new Date()}
});

BoolTable = PersistObjectTemplate.create("BoolTable", {
    boolField: {type: Boolean}
});

DateTable = PersistObjectTemplate.create("DateTable", {
   dateField: {type: Date}
});

var SingleIndexTable = PersistObjectTemplate.create("SingleIndexTable", {
    id: { type: Number},
    name: { type: String, value: "Name"},
    init: function(id, name){
        this.id = id;
        this.name = name;
    }
})


var MultipleIndexTable = PersistObjectTemplate.create("MultipleIndexTable", {
    id: { type: Number},
    name: { type: String, value: "Name"},
    init: function(id, name){
        this.id = id;
        this.name = name;
    }
})

var emp = new Employee(100, 'temp employee');
var sai = new Employee(000, 'contractor');
var MongoClient = require('mongodb').MongoClient;
var Q = require('Q');
var db;
var schema = {
    Employee: {
        documentOf: "pg/Employee"
    },
    Manager: {
        documentOf: "pg/Manager"
    },
    BoolTable: {
        documentOf: "pg/BoolTable"
    },
    DateTable: {
        documentOf: "pg/DateTable"
    },
    SingleIndexTable: {
        documentOf: "pg/SingleIndexTable",
        indexes: [{
            name: "single_index",
            def: {
                columns: ["id", "name"],
                type: "unique"
            }
        }]
    },
    MultipleIndexTable: {
        documentOf: "pg/MultipleIndexTable",
        indexes: [{
            name: "fst_index",
            def: {
                columns: ["id"],
                type: "unique"
            }
        },
            {
                name: "scd_index",
                def: {
                    columns: ["name"],
                    type: "index"
                }
            }]
    }
}

function clearCollection(template) {
    var collectionName = template.__collection__.match(/\//) ? template.__collection__ : 'mongo/' + template.__collection__;
    console.log("Clearing " + collectionName);
    if (collectionName.match(/mongo\/(.*)/)) {
        collectionName = RegExp.$1;
        return Q.ninvoke(db, "collection", collectionName).then(function (collection) {
            return Q.ninvoke(collection, "remove", {}, {w:1}).then (function () {
                return Q.ninvoke(collection, "count")
            });
        });
    }
    else if (collectionName.match(/pg\/(.*)/)) {
        collectionName = RegExp.$1;
        return PersistObjectTemplate.dropKnexTable(template)
            .then(function () {
                return PersistObjectTemplate.createKnexTable(template).then(function(){return 0});
            });
    } else
        throw "Invalid collection name " + collectionName;

}

describe('type mapping tests', function() {

    before(function (done) {
        console.log('database connections initialized..');
        return Q()
            .then(function () {
                var db = require('knex')({
                    client: 'pg',
                    connection: {
                        host     : '127.0.0.1',
                        port     : 5433,
                        database : 'persistor_banking',
                        //user: 'postgres',
                        //password: 'postgres'
                        user: 'pg_testuser',
                        password: 'pg_testuser'
                    }});
                PersistObjectTemplate.setDB(db, PersistObjectTemplate.DB_PG, 'pg');
                PersistObjectTemplate.setSchema(schema);
                PersistObjectTemplate.performInjections(); // Normally done by getTemplates
                done();
            }).fail(function(e){done(e)});;
    });

    before('arrange', function(done){

        Q.all([
            PersistObjectTemplate.dropKnexTable(Employee).should.eventually.have.property("command", "DROP"),
            PersistObjectTemplate.dropKnexTable(Manager).should.eventually.have.property("command", "DROP"),
            PersistObjectTemplate.dropKnexTable(BoolTable).should.eventually.have.property("command", "DROP"),
            PersistObjectTemplate.dropKnexTable(DateTable).should.eventually.have.property("command", "DROP"),
            PersistObjectTemplate.dropKnexTable(SingleIndexTable).should.eventually.have.property("command", "DROP"),
            PersistObjectTemplate.dropKnexTable(MultipleIndexTable).should.eventually.have.property("command", "DROP"),
        ]).should.notify(done);
    });


    it("create a simple table", function(done){
         PersistObjectTemplate.createKnexTable(Employee).then(function(status){
            return PersistObjectTemplate.checkForKnexTable(Employee).should.eventually.equal(true);
        }).should.notify(done);
    });



    it("create a table for extended object", function(done){
        return PersistObjectTemplate.createKnexTable(Manager)
            .then(function(status){
                return PersistObjectTemplate.checkForKnexTable(Manager)
            }).then(function(exists) {
                expect(exists).to.equal(true);
                done();
            }).catch(function(error){
                done(error);
            });
    });

    it("create a table with a boolean field", function(){
        //don't like to check the result this way.. but I felt that using knex in the test cases is equally bad
        //and the knex responses are not clean, will check with Sam and make necessary changes..
        return PersistObjectTemplate.createKnexTable(BoolTable).then(function(status) {
            return PersistObjectTemplate.checkForKnexColumnType(BoolTable, 'boolField').should.eventually.equal('boolean');
        })
    });
    it("create a table with a date field", function(){
        return PersistObjectTemplate.createKnexTable(DateTable).then(function(status) {
            return PersistObjectTemplate.checkForKnexColumnType(DateTable, 'dateField').should.eventually.contains('timestamp');
        })
    });


    it("add a property to the model and synchronize the model to DB", function(done){
        Employee.mixin({
            newField1:      {type: String, value: "Test Mixin"},
            newField2:      {type: String, value: "Test Mixin"}
        });
        PersistObjectTemplate.synchronizeKnexDbFromModel(Employee).then(function(status) {
            return PersistObjectTemplate.checkForKnexColumnType(Employee, 'newField2').should.eventually.equal('character varying');
        }).should.notify(done);
    });

    it("create a table with an index", function(){
        //don't like to check the result this way.. but I felt that using knex in the test cases is equally bad
        //and the knex responses are not clean, will check with Sam and make necessary changes..
        return PersistObjectTemplate.createKnexTable(SingleIndexTable).then(function(status) {
            return PersistObjectTemplate.checkForKnexTable(SingleIndexTable).should.eventually.equal(true);
        })
    });

    it("drop an index if exits", function() {
        return   PersistObjectTemplate.DropIfKnexIndexExists(SingleIndexTable, "single_index").should.eventually.have.property("command").that.match(/DROP|ALTER/);
    });

    it("drop an index which does not exists to check the exception", function() {
        return PersistObjectTemplate.DropIfKnexIndexExists(SingleIndexTable, "notavailable").should.be.rejectedWith(Error);
    });

    it("create a table with multiple indexes", function(){
        //don't like to check the result this way.. but I felt that using knex in the test cases is equally bad
        //and the knex responses are not clean, will check with Sam and make necessary changes..
        return PersistObjectTemplate.createKnexTable(MultipleIndexTable).then(function(status) {
            return PersistObjectTemplate.checkForKnexTable(MultipleIndexTable).should.eventually.equal(true);
        })
    });


    it("save all employees in the cache...", function(done){
        var ravi = new Employee(2, 'kumar');
        return PersistObjectTemplate.saveAll().should.eventually.equal(true).should.notify(done);

    });

    it("save employee individually...", function() {
        var validEmployee = new Employee('100', 'New Employee');
        return validEmployee.persistSave().then(function (id){
            expect(id.length).to.equal(24);
            expect(validEmployee._id).to.equal(id);
        });
    });

    it("should throw exception for non numeric ids", function() {
        var invalidEmployee = new Employee('AAAA', 'Failed Employee');
        return invalidEmployee.persistSave().should.be.rejectedWith(Error, 'insert into');
    });
})


//return PersistObjectTemplate.createKnexTable(Employee).then(function(status){
//    //don't like to check the result this way.. but I felt that using knex in the test cases is equally bad
//    //and the knex responses are not clean for the
//    //will check with Sam and make necessary changes..
//    return PersistObjectTemplate.checkForKnexTable(Employee)
//}).then(function(exists){
//        expect(exists).to.equal(true);
//        done();
//}).catch(function(error){
//    done(error);
//});
//return   PersistObjectTemplate.DropIfKnexIndexExists(Employee, "notavailable").should.be.rejectedWith('alter table "Employee" drop constraint notavailable - constraint "notavailable" of relation "Employee" does not exist');
//return expect(PersistObjectTemplate.DropIfKnexIndexExists(Employee, "notavailable"))
//  .to.eventually.throw(Error, 'alter table "Employee" drop constraint notavailable - constraint "notavailable" of relation "Employee" does not exist');

//return PersistObjectTemplate.DropIfKnexIndexExists(Employee, "notavailable").then(function(data){
//   console.log(data);
//}).catch(function(error){
//    console.log(error);
//});
