var chai = require('chai'),
    expect = require('chai').expect;

var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

var Promise = require('bluebird');

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
var Phone, Address, Employee, empId, addressId, phoneId, Role;
var PersistObjectTemplate, ObjectTemplate;

describe('persistor transaction checks', function () {
    before('drop schema table once per test suit', function() {
        return Promise.all([

            knex.schema.dropTableIfExists('tx_employee')
                .then(function () {
                    return knex.schema.dropTableIfExists('tx_address')
                }).then(function () {
                    return knex.schema.dropTableIfExists('tx_phone')
                }).then(function () {
                    return knex.schema.dropTableIfExists('tx_department')
                }).then(function () {
                    return knex.schema.dropTableIfExists('tx_role')
                }),
            knex.schema.dropTableIfExists(schemaTable)]);
    })
    beforeEach('arrange', function () {
        ObjectTemplate = require('supertype');
        PersistObjectTemplate = require('../index.js')(ObjectTemplate, null, ObjectTemplate);

        schema.Employee = {};
        schema.Address = {};
        schema.Phone = {};
        schema.Dept = {};
        schema.Employee.table = 'tx_employee';
        schema.Address.table = 'tx_address';
        schema.Phone.table = 'tx_phone';

        schema.Employee.parents = {
            homeAddress: {id: 'address_id',
                fetch: true}
        };
        schema.Employee.children = {
            roles: {id: 'employee_id'}
        };
        schema.Role = {};
        schema.Role.table = 'tx_role';
        schema.Role.parents = {
            employee: {id: 'employee_id'}
        };
        schema.Role.children = {
            department: {id: 'role_id'}
        };

        schema.Address.parents = {
            phone: {id: 'phone_id'}
        };
        Phone = PersistObjectTemplate.create('Phone', {
            number: {type: String}
        });

        Address = PersistObjectTemplate.create('Address', {
            city: {type: String},
            state: {type: String},
            phone: {type: Phone}
        });


        Role = PersistObjectTemplate.create('Role', {
            name: {type:String},

        });

        Employee = PersistObjectTemplate.create('Employee', {
            name: {type: String, value: 'Test Employee'},
            homeAddress: {type: Address},
            roles: {type: Array, of:Role, value: []}
        });

        Role.mixin({
            employee: {type: Employee}
        });
        var emp = new Employee();
        var add = new Address();
        var phone = new Phone();
        var role1 = new Role();
        role1.name = 'firstRole2';
        role1.employee = emp;
        var role2 = new Role();
        role2.name = 'secondRole2';
        role2.employee = emp;

        phone.number = '1231231234';
        add.city = 'New York';
        add.state = 'New York';
        add.phone = phone;
        emp.name = 'Ravi';
        emp.homeAddress = add;
        emp.roles.push(role1);
        emp.roles.push(role2);

        (function () {
            PersistObjectTemplate.setDB(knex, PersistObjectTemplate.DB_Knex);
            PersistObjectTemplate.setSchema(schema);
            PersistObjectTemplate.performInjections();

        })();
        return Promise.resolve(prepareData());

        function prepareData() {
            PersistObjectTemplate.performInjections();
            return syncTable(Employee)
                .then(syncTable.bind(this, Address))
                .then(syncTable.bind(this, Phone))
                .then(syncTable.bind(this, Role))
                .then(addConstraint.bind(this))
                .then(createRecords.bind(this));


            function syncTable(template) {
                return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template);
            }

            function addConstraint() {
                return knex.raw('ALTER TABLE tx_role ADD CONSTRAINT namechk CHECK (char_length(name) <= 50);')
            }

            function createRecords() {
                var tx =  PersistObjectTemplate.beginDefaultTransaction();
                emp.save({transaction: tx, cascade: false});
                return PersistObjectTemplate.commit(tx).then(function() {
                    empId = emp._id;
                    addressId = add._id;
                    phoneId = phone._id;
                });
            }
        }
    });

    afterEach('remove tables and after each test', function() {
        return Promise.all([
            knex.schema.dropTableIfExists('tx_employee')
                .then(function () {
                    return knex.schema.dropTableIfExists('tx_address')
                }).then(function () {
                    return knex.schema.dropTableIfExists('tx_phone')
                }).then(function () {
                    return knex.schema.dropTableIfExists('tx_department')
                }).then(function () {
                    return knex.schema.dropTableIfExists('tx_role')
                }),
            knex.schema.dropTableIfExists(schemaTable)]);
    });

    it('fetchById without fetch spec should not return the records', function () {
        return Employee.fetchById(empId, {fetch: {homeAddress: false}})
            .then(function(employee) {
                expect(employee.homeAddress).is.equal(null);
            });
    });

    it('fetchById with fetch spec should return the records', function () {
        return Employee.fetchById(empId, {fetch: { homeAddress: {fetch: {phone: false}}, roles: true}}).then(function(employee) {
            expect(employee.homeAddress._id).is.equal(addressId);
            expect(employee.homeAddress.phone).is.equal(null);
        });
    });

    it('fetchById with fetch spec should return the records', function () {
        return Employee.fetchById(empId, {fetch: { homeAddress: {fetch: {phone: false}}, roles: true}}).then(function(employee) {
            expect(employee.homeAddress._id).is.equal(addressId);
            expect(employee.homeAddress.phone).is.equal(null);
        });
    });

    it('fetchById with multiple level fetch spec should return the records', function () {
        return Employee.fetchById(empId, {fetch: { homeAddress: {fetch: {phone: true}}, roles: true}}).then(function(employee) {
            expect(employee.homeAddress._id).is.equal(addressId);
            expect(employee.homeAddress.phone._id).is.equal(phoneId);
        });
    });

    it('fetch without fetch spec should not return the records', function () {
        return Employee.fetch({_id: empId}, {fetch: {homeAddress: false}}).then(function(employee) {
            expect(employee[0].homeAddress).is.equal(null);
        });
    });

    it('fetch with fetch spec should not return the records', function () {
        return Employee.fetch({_id: empId},  {fetch: {homeAddress: true}, logger: PersistObjectTemplate.logger, start: 0, limit: 5, order: {name: 1} }).then(function(employee) {
            expect(employee[0].homeAddress._id).is.equal(addressId);
            expect(employee[0].homeAddress.phone).is.equal(null);
        });
    });

    it('fetch with fetch with multiple levels should return the records', function () {
        return Employee.fetch({_id: empId}, {fetch: { homeAddress: {fetch: {phone: false}}, roles: true}, logger: PersistObjectTemplate.logger}, 0, 5, true, {}, {customOptions: 'custom'}).then(function(employee) {
            expect(employee[0].homeAddress._id).is.equal(addressId);
            expect(employee[0].homeAddress.phone).is.equal(null);
        });
    });

    it('fetchById with multiple level fetch spec should return the records', function () {
        return Employee.fetchById(empId, {fetch: { homeAddress: {fetch: {phone: true}}, roles: true}}).then(function(employee) {
            expect(employee.homeAddress._id).is.equal(addressId);
            expect(employee.homeAddress.phone._id).is.equal(phoneId);
        });
    });

    it('fetchByQuery with fetch spec should return the records and also load the child objects in the calling object', function () {
        return Employee.fetchById(empId, {fetch: {homeAddress: false}})
            .then(function(employee) {
                return employee.fetchByQuery({fetch: { homeAddress: {fetch: {phone: true}}, roles: true}}).then(function(obj) {
                    expect(obj.homeAddress._id).is.equal(addressId);
                    expect(employee.homeAddress._id).is.equal(addressId);
                })
            });
    });

    it('using commit will save all the objects in the graph', function () {
        var emp1 = new Employee();
        var add1 = new Address();
        var phone1 = new Phone();
        phone1.number = '222222222';
        add1.city = 'New York1';
        add1.state = 'New York1';
        add1.phone = phone1;
        emp1.name = 'Ravi1';
        emp1.homeAddress = add1;

        var tx =  PersistObjectTemplate.beginDefaultTransaction();
        emp1.save({transaction: tx, cascade: false});
        return PersistObjectTemplate.commit().then(function() {
            return Address.countFromPersistWithQuery().then(function(count) {
                expect(count).to.equal(2);
            });
        });
    });

    it('using beginTransaction will not set the objects as dirty in default trasaction', function () {
        var emp1 = new Employee();
        var add1 = new Address();
        var phone1 = new Phone();
        phone1.number = '222222222';
        add1.city = 'New York1';
        add1.state = 'New York1';
        add1.phone = phone1;
        emp1.name = 'Ravi1';
        emp1.homeAddress = add1;

        var tx =  PersistObjectTemplate.beginTransaction();
        emp1.save({transaction: tx, cascade: false});
        return PersistObjectTemplate.commit().then(function() {
            return Address.countFromPersistWithQuery().then(function(count) {
                expect(count).to.equal(1);
            });
        });
    });

    it('using beginTransaction will not set the objects as dirty in default trasaction', function () {
        var emp1 = new Employee();
        var add1 = new Address();
        var phone1 = new Phone();
        phone1.number = '222222222';
        add1.city = 'New York1';
        add1.state = 'New York1';
        add1.phone = phone1;
        emp1.name = 'RaviNotSaved';
        emp1.homeAddress = add1;

        var tx =  PersistObjectTemplate.beginTransaction();
        emp1.save({transaction: tx, cascade: false});
        return PersistObjectTemplate.commit().then(function() {
            return Employee.fetch({name: 'RaviNotSaved'}).then(function(employees) {
                expect(employees.length).to.equal(0);
            });
        });
    });

    it('using beginTransaction and passing trasaction object to the commit', function () {
        var emp1 = new Employee();
        var add1 = new Address();
        var phone1 = new Phone();
        phone1.number = '222222222';
        add1.city = 'New York1';
        add1.state = 'New York1';
        add1.phone = phone1;
        emp1.name = 'RaviNotSaved';
        emp1.homeAddress = add1;

        var tx =  PersistObjectTemplate.beginTransaction();
        emp1.save({transaction: tx, cascade: false});
        return PersistObjectTemplate.commit(tx).then(function() {
            return Employee.fetch({name: 'RaviNotSaved'}).then(function(employees) {
                expect(employees.length).to.equal(1);
            });
        });
    });

    it('calling persist delete with transaction', function () {
        var emp, add;
        return createFKs()
            .then(loadEmployee.bind(this))
            .then(setTestObjects.bind(this))
            .then(realTest.bind(this));

        function loadEmployee() {
            return Employee.fetchById(empId, {fetch: {homeAddress: true}})
        }

        function setTestObjects(employee) {
            emp = employee;
            add = employee.homeAddress;
        }
        function realTest() {
            var tx =  PersistObjectTemplate.beginTransaction();
            add.delete({transaction: tx});
            emp.delete({transaction: tx});
            return PersistObjectTemplate.commit(tx)
        }

        function createFKs() {
            return knex.raw('ALTER TABLE public.tx_employee ADD CONSTRAINT fk_tx_employee_address FOREIGN KEY (address_id) references public.tx_address("_id") deferrable initially deferred');
        }
    });

});