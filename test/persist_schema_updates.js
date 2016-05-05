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


var Employee = PersistObjectTemplate.create("Employee", {
    id: {type: Number},
    name: {type: String, value: "Test Employee"},
    newField: {type: String, value: "Test Employee", customField: "customValue"},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})


Manager = Employee.extend("Manager", {
    init: function () {
        this.id = 12312;
        this.name = "Manager";
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

var ChangeFieldTypeTable = PersistObjectTemplate.create("ChangeFieldTypeTable", {
    id: {type: Number},
    name: {type: String, value: "Test Employee"},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})

var SingleIndexTable = PersistObjectTemplate.create("SingleIndexTable", {
    id: {type: Number},
    name: {type: String, value: "Name"},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})


var MultipleIndexTable = PersistObjectTemplate.create("MultipleIndexTable", {
    id: {type: Number},
    name: {type: String, value: "Name"},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
})

var ChangeFieldTypeTable = PersistObjectTemplate.create("ChangeFieldTypeTable", {
    id: {type: String},
    name: {type: String, value: "Test Employee"},
    init: function (id, name) {
        this.id = id;
        this.name = name;
    }
});

var IndexSyncTable = PersistObjectTemplate.create('IndexSyncTable', {
    id: {type: Number},
    name: {type: String, value: "Test Employee"}
})

var Parent = PersistObjectTemplate.create("Parent", {
    first: {type: String},
    last: {type: String}
});

var ExtendParent = Parent.extend("ExtendParent", {
    extend: {type: String}
});

var obj1 = new Employee(100, 'temp employee');
var obj2 = new Employee(000, 'contractor');

var Q = require('Q');
var db;
var schema = {
    Employee: {
        documentOf: "pg/employee"
    },
    Manager: {
        documentOf: "pg/Manager",
        indexes: [{
            name: "single_index",
            def: {
                columns: ["dob", "name"],
                type: "unique"
            }
        }]
    },
    Parent: {
        documentOf:"pg/ParentExtendTest"
    },
    BoolTable: {
        documentOf: "pg/BoolTable"
    },
    DateTable: {
        documentOf: "pg/DateTable"
    },
    ChangeFieldTypeTable: {
        documentOf: "pg/ChangeFieldTypeTable"
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
        indexes: [
            {
                name: "fst_index",
                def: {
                    columns: ["name"],
                    type: "index"
                }
            },
            {
                name: "scd_index",
                def: {
                    columns: ["name", "id"],
                    type: "index"
                }
            }]
    },
    IndexSyncTable: {
        documentOf: "pg/IndexSyncTable",
        indexes: [
            {
                name: "Fst_Index",
                def: {
                    columns: ["name"],
                    type: "index"
                }
            }
        ]
    }
}




describe('index synchronization checks', function () {
    before('arrange', function (done) {
        (function () {
            var db = require('knex')({
                client: 'pg',
                connection: {
                    host: '127.0.0.1',
                    database: 'persistor_banking',
                    user: 'nodejs',
                    password: 'nodejs'

                }
            });
            PersistObjectTemplate.setDB(db, PersistObjectTemplate.DB_Knex, 'pg');
            PersistObjectTemplate.setSchema(schema);
            PersistObjectTemplate.performInjections(); // Normally done by getTemplates
        })();
        return Q.all([
            knex.schema.dropTableIfExists('NewTable'),
            PersistObjectTemplate.dropKnexTable(Employee),
            PersistObjectTemplate.dropKnexTable(Manager),
            PersistObjectTemplate.dropKnexTable(BoolTable),
            PersistObjectTemplate.dropKnexTable(DateTable),
            PersistObjectTemplate.dropKnexTable(SingleIndexTable),
            PersistObjectTemplate.dropKnexTable(MultipleIndexTable),
            PersistObjectTemplate.dropKnexTable(Parent),
            knex('haven_schema1').del(),

        ]).should.notify(done);
    });


    it("create a simple table", function (done) {
        return PersistObjectTemplate.createKnexTable(Employee).then(function (status) {
            return PersistObjectTemplate.checkForKnexTable(Employee).should.eventually.equal(true);
        }).should.notify(done);
    });



    it("change to incompatible type and check for exception", function () {
        var knex = require('knex')({
            client: 'pg',
            connection: {
                host: '127.0.0.1',
                database: 'persistor_banking',
                user: 'nodejs',
                password: 'nodejs'

            }
        });
        return knex.schema.createTableIfNotExists('ChangeFieldTypeTable', function (table) {
            table.integer('id');
            table.text('name')
        }).then(function () {
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(ChangeFieldTypeTable).should.eventually.be.rejectedWith(Error);
        });
    });


    it("create a table for extended object", function () {
    return PersistObjectTemplate.createKnexTable(ExtendParent).then(function() {
            return PersistObjectTemplate.checkForKnexTable(Parent).should.eventually.equal(true);
        })
    });


    it("create a table with a boolean field", function () {
        return PersistObjectTemplate.createKnexTable(BoolTable).then(function (status) {
            return PersistObjectTemplate.checkForKnexColumnType(BoolTable, 'boolField').should.eventually.equal('boolean');
        })
    });

    it("create a table with a date field", function () {
        return PersistObjectTemplate.createKnexTable(DateTable).then(function () {
            return PersistObjectTemplate.checkForKnexColumnType(DateTable, 'dateField').should.eventually.contains('timestamp');
        })
    });

    it("create a table with an index", function () {
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(SingleIndexTable).then(function () {
            return PersistObjectTemplate.checkForKnexTable(SingleIndexTable).should.eventually.equal(true);
        })
    });


    var knex = require('knex')({
        client: 'pg',
        connection: {
            host: '127.0.0.1',
            database: 'persistor_banking',
            user: 'nodejs',
            password: 'nodejs'
        }
    });

    describe('synchronize the table with schema changes', function () {

        before('arrange', function (done) {


            /*Step1: Drop if index test table exists..
             Step2: Create the table without indexes..
             Step3: set the schema version table without any indexes...
             */


            return Q.all(
                [   knex.schema.dropTableIfExists('employee'),
                    knex.schema.dropTableIfExists('BoolTable'),
                    knex.schema.dropTableIfExists('ChangeFieldTypeTable'),
                    knex.schema.dropTableIfExists('DateTable'),
                    knex.schema.dropTableIfExists('CreatingTable'),
                    knex.schema.dropTableIfExists('CreateNewType'),
                    knex.schema.dropTableIfExists('IndexSyncTable').then(function() {
                         knex.schema.createTableIfNotExists('IndexSyncTable', function (table) {
                            table.double('id');
                            table.text('name')
                        })
                    }),
                    knex('haven_schema1').del()
                ]).should.notify(done);
        });



        it('synchronize the index definition and check if the index exists on the table by dropping the index', function () {

           return  PersistObjectTemplate.synchronizeKnexTableFromTemplate(IndexSyncTable).then(function () {
                    return knex.schema.table('IndexSyncTable', function (table) {
                        table.dropIndex([], 'Idx_IndexSyncTable_name');
                    }).should.eventually.have.property("command")
                }
            );
        });

        it("create a new type and synchronize the table.. ", function () {
            schema.CreateNewType = {};
            schema.CreateNewType.documentOf = "pg/CreateNewType";
            var CreateNewType = PersistObjectTemplate.create("CreateNewType", {
                id: {type: String}
            })

            PersistObjectTemplate._verifySchema();
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(CreateNewType).then(function (status) {
                return PersistObjectTemplate.checkForKnexTable(CreateNewType).should.eventually.equal(true);
            })
        });


        it("use the same index names on multiple tables and create index to check the name generation process", function () {
            schema.Employee.indexes = JSON.parse('[{"name": "single_index","def": {"columns": ["name"],"type": "unique"}}]');
            schema.Manager.indexes = JSON.parse('[{"name": "single_index","def": {"columns": ["name"],"type": "unique"}}]');

                return PersistObjectTemplate.synchronizeKnexTableFromTemplate(Employee).then(function (status) {
                    return PersistObjectTemplate.checkForKnexTable(Employee).should.eventually.equal(true);
                })

        })


        it('add a new type and check if the table creation is adding the index definition...', function(){
            schema.CreatingTable = {};
            schema.CreatingTable.documentOf = "pg/CreatingTable";
            schema.CreatingTable.indexes = JSON.parse('[{"name": "single_index_1","def": {"columns": ["id"],"type": "unique"}}]');
            var CreatingTable = PersistObjectTemplate.create("CreatingTable", {
                id: {type: String},
                name: {type: String, value: "CreatingTable"},
                init: function (id, name) {
                    this.id = id;
                    this.name = name;
                }
            })

            return Q(PersistObjectTemplate._verifySchema()).then(function () {
                return PersistObjectTemplate.createKnexTable(CreatingTable).then(function () {
                    return PersistObjectTemplate.checkForKnexTable(CreatingTable).should.eventually.equal(true);
                })
            })
        })
    });

    it('Add a new index and call createKnexTable to create the table and the corresponding indexes', function () {
        schema.newTable = {};
        schema.newTable.documentOf = "pg/NewTable";
        var newTable = PersistObjectTemplate.create("newTable", {
            id: {type: String},
            name: {type: String, value: "PrimaryIndex"},
            init: function (id, name) {
                this.id = id;
                this.name = name;
            }
        })
        schema.newTable.indexes = (JSON.parse('[{"name": "scd_index","def": {"columns": ["id"],"type": "primary"}}]'));

        PersistObjectTemplate._verifySchema();
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(newTable).should.eventually.be.rejectedWith(Error, 'index type can be only \"unique\" or \"index\"');
    });

    it('add a new table definition to the schema and try to synchronize', function () {
        schema.newTable = {};
        schema.newTable.documentOf = "pg/NewTable";
        var newTable = PersistObjectTemplate.create("newTable", {
            id: {type: String},
            name: {type: String, value: "PrimaryIndex"},
            init: function (id, name) {
                this.id = id;
                this.name = name;
            }
        })
        schema.newTable.indexes = JSON.parse('[{"name": "single_index","def": {"columns": ["id", "name"],"type": "unique"}}]');
        PersistObjectTemplate._verifySchema();
        return PersistObjectTemplate.synchronizeKnexTableFromTemplate(newTable).then(function () {
            return knex('haven_schema1')
                .select('schema')
                .orderBy('sequence_id', 'desc')
                .limit(1)
                .then(function (records) {
                    return Q(records[0].schema);
                })
        }).should.eventually.contain('NewTable');

    });


    it("drop an index if exits", function () {
        return PersistObjectTemplate.DropIfKnexIndexExists(SingleIndexTable, "idx_singleindextable_id_name").should.eventually.have.property("command").that.match(/DROP|ALTER/);
    });

    it("drop an index which does not exists to check the exception", function () {
        return PersistObjectTemplate.DropIfKnexIndexExists(SingleIndexTable, "notavailable").should.be.rejectedWith(Error);
    });

    it("create a table with multiple indexes", function () {
        //don't like to check the result this way.. but I felt that using knex in the test cases is equally bad
        //and the knex responses are not clean, will check with Sam and make necessary changes..
        return PersistObjectTemplate.createKnexTable(MultipleIndexTable).then(function (status) {
            return PersistObjectTemplate.checkForKnexTable(MultipleIndexTable).should.eventually.equal(true);
        })
    });


    it("save all employees in the cache...", function (done) {
        var ravi = new Employee(2, 'kumar');
        return PersistObjectTemplate.saveAll().should.eventually.equal(true).should.notify(done);

    });

    it('save bool type and check the return value and type', function () {
       var boolData = new BoolTable(true);
       return boolData.persistSave().should.eventually.equal(boolData._id).then(function () {
           var fetchbool = new Boolean();
           //return BoolTable.getFromPersistWithQuery({'boolField': true}).then(function(record){
           //   // console.dir(record);
           //})
       })
    })

    it("save employee individually...", function (done) {
        var validEmployee = new Employee('1111', 'New Employee');
        try {
            validEmployee.persistSave().then(function (id) {
                expect(id.length).to.equal(24);
                expect(validEmployee._id).to.equal(id);
                done();
            });
        }
        catch(e) {
            console.dir(e);
            done(e);
        }
    });

    it("should throw exception for non numeric ids", function () {
        var invalidEmployee = new Employee('AAAA', 'Failed Employee');
        return invalidEmployee.persistSave().should.be.rejectedWith(Error, 'insert into');
    });


})

