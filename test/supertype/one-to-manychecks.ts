
declare function require(name:string);
var ObjectTemplate = require('supertype');
var PersistObjectTemplate = require('../../index.js')(ObjectTemplate, null, ObjectTemplate);

PersistObjectTemplate.debugInfo = 'api;conflict;write;read;data';//'api;io';
PersistObjectTemplate.debugInfo = 'conflict;data';//'api;io';
PersistObjectTemplate.logger.setLevel('debug');


import { expect } from 'chai';
import * as mocha from 'mocha';
import * as _ from 'underscore';
import {Employee} from "./Employee";
import Promise = require('bluebird');
import {Responsibility} from "./Responsibility";


var schema = {
    Employee: {
        documentOf: 'pg/employee',
        children: {
            responsibilities: {id: 'employee_id'},
        }
    },
    Responsibility: {
        documentOf: 'pg/responsibility',
        parents: {
            employee: {id: 'employee_id'}
        }
    },
};



describe('Banking from pgsql Example', function () {
    var knex;

        before('arrange', function () {
            (function () {
                knex = require('knex')({
                    client: 'pg',
                    debug: true,
                    connection: {
                        host: '127.0.0.1',
                        database: 'persistor_banking',
                        user: 'postgres',
                        password: 'postgres'

                    }
                });

                PersistObjectTemplate.setDB(knex, PersistObjectTemplate.DB_Knex,  'pg');
                PersistObjectTemplate.setSchema(schema);
                PersistObjectTemplate.performInjections();

            })();



            return Promise.all([
                knex.schema.dropTableIfExists('employee'),
                knex.schema.dropTableIfExists('responsibility')])
                .then(function() {
                    return PersistObjectTemplate.synchronizeKnexTableFromTemplate(Employee)
                        .then(function() {
                            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(Responsibility);
                        })
                })
                .then(function() {

                    var ravi = new Employee('Ravi',  'Kumar');
                    var test = new Employee('Test', 'RTest');

                    var responsbility1 = new Responsibility('work1', 'doing work');
                    var responsbility2 = new Responsibility('work2', 'doing work');
                    ravi.responsibilities.push(responsbility1);
                    test.responsibilities.push(responsbility2);

                    return Promise.all([ravi.persistSave(),
                        test.persistSave(),
                        responsbility1.persistSave(),
                        responsbility2.persistSave(),
                    ]);

                })
        });




    it('create a simple table', function () {
        return Employee.getFromPersistWithQuery({}, {responsibilities: true}).then (function (employees) {
            expect(employees.responsibilities.length).to.equal(1);
        })
    });
});