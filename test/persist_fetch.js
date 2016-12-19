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
var Phone, Address, Employee, empId, addressId, phoneId;
var PersistObjectTemplate, ObjectTemplate;

describe('persistor transaction checks', function () {
    before('drop schema table once per test suit', function() {
        return Promise.all([
            knex.schema.dropTableIfExists('tx_employee').then(function () {
                return knex.schema.dropTableIfExists('tx_address').then(function () {
                    return knex.schema.dropTableIfExists('tx_phone')
                })
            }), knex.schema.dropTableIfExists(schemaTable)]);
    })
    beforeEach('arrange', function () {
        ObjectTemplate = require('supertype');
        PersistObjectTemplate = require('../index.js')(ObjectTemplate, null, ObjectTemplate);

        schema.Employee = {};
        schema.Address = {};
        schema.Phone = {};
        schema.Employee.table = 'tx_employee';
        schema.Address.table = 'tx_address';
        schema.Phone.table = 'tx_phone';
        schema.Employee.parents = {
            homeAddress: {id: 'address_id'}
        };
        schema.Address.parents = {
            phone: {id: 'phone_id'}
        };
        Phone = PersistObjectTemplate.create('Phone', {
            number: {type: String}
        });

        Address = PersistObjectTemplate.create('Address', {
            city: {type: String},
            state: {type: String}
            , phone: {type: Phone}
        });

        Employee = PersistObjectTemplate.create('Employee', {
            name: {type: String, value: 'Test Employee'},
            homeAddress: {type: Address}
        });
        var emp = new Employee();
        var add = new Address();
        var phone = new Phone();
        phone.number = '1231231234';
        add.city = 'New York';
        add.state = 'New York';
        add.phone = phone;
        emp.name = 'Ravi';
        emp.homeAddress = add;


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
                .then(createRecords.bind(this));


            function syncTable(template) {
                return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template);
            }

            function createRecords() {
                var tx =  PersistObjectTemplate.begin();
                emp.setDirty(tx);
                add.setDirty(tx);
                phone.setDirty(tx);
                return PersistObjectTemplate.end(tx).then(function() {
                    empId = emp._id;
                    addressId = add._id;
                    phoneId = phone._id;
                });
            }
        }
    });

    afterEach('remove tables and after each test', function() {
        return Promise.all([
            knex.schema.dropTableIfExists('tx_employee').then(function () {
                return knex.schema.dropTableIfExists('tx_address').then(function () {
                    return knex.schema.dropTableIfExists('tx_phone')
                })
            }), knex.schema.dropTableIfExists(schemaTable)]);
    });

    it('check basic fetch without fetch spec should not return the records', function () {
        return Employee.getFromPersistWithId(empId).then(function(employee) {
            expect(employee.homeAddress).is.equal(null);
        });
    });

    it('check basic fetch with fetch spec should return the records', function () {
        return Employee.getFromPersistWithId(empId, { homeAddress: {fetch: {phone: true}}}).then(function(employee) {
            expect(employee.homeAddress._id).is.equal(addressId);
            expect(employee.homeAddress.phone._id).is.equal(phoneId);
        });
    });

    it('check basic fetch without fetch spec should not return the records', function () {
        return Employee.getFromPersistWithQuery({_id: empId}, null, 0, 5, true, {}, {customOptions: 'custom'}, PersistObjectTemplate.logger).then(function(employee) {
            expect(employee[0].homeAddress).is.equal(null);
        });
    });

    it('check basic fetch without fetch spec should not return the records', function () {
        return Employee.getFromPersistWithQuery({_id: empId}, {homeAddress: true}, 0, 5, true, {}, {customOptions: 'custom'}, PersistObjectTemplate.logger).then(function(employee) {
            expect(employee[0].homeAddress._id).is.equal(addressId);
            expect(employee[0].homeAddress.phone).is.equal(null);
        });
    });

    it('check basic fetch without fetch spec should not return the records', function () {
        return Employee.getFromPersistWithQuery({_id: empId}, {homeAddress: true}, 0, 5, true, {}, {customOptions: 'custom'}, PersistObjectTemplate.logger).then(function(employee) {
            expect(employee[0].homeAddress._id).is.equal(addressId);
            expect(employee[0].homeAddress.phone).is.equal(null);
        });
    });

    it('use setDirty and add one more record', function () {
        var emp1 = new Employee();
        var add1 = new Address();
        var phone1 = new Phone();
        phone1.number = '222222222';
        add1.city = 'New York1';
        add1.state = 'New York1';
        add1.phone = phone1;
        emp1.name = 'Ravi1';
        emp1.homeAddress = add1;

        var tx =  PersistObjectTemplate.begin();
        emp1.setDirty(tx);
        add1.setDirty(tx);
        phone1.setDirty(tx);
        return PersistObjectTemplate.end(tx).then(function() {
            return Employee.countFromPersistWithQuery().then(function(count) {
                expect(count).to.equal(2);
            });
        });
    });

});