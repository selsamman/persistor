/*
 * Banking example shows PersistObjectTemplate with
 * many-to-many relationships
 *
 */

var expect = require('chai').expect;
var Q = require("q");
var ObjectTemplate = require('supertype');
var PersistObjectTemplate = require('../index.js')(ObjectTemplate, null, ObjectTemplate);
var writing = true;
/*
PersistObjectTemplate.debug = function(m, t) {
    if (t.match(/(query)|(io)/))
    {
        console.log(m)
    }
}
*/
var Customer = PersistObjectTemplate.create("Customer", {
	init: function (first, middle, last) {
		this.firstName = first;
		this.lastName = last;
		this.middleName = middle;
        expect(writing).equal(true);
	},
	email:		{type: String, value: "", length: 50, rule: ["text", "email", "required"]},
	firstName:  {type: String, value: "", length: 40, rule: ["name", "required"]},
	middleName: {type: String, value: "", length: 40, rule: "name"},
	lastName:	{type: String, value: "", length: 40, rule: ["name", "required"]},
	phones:		{type: Array, of: String, value: [""], max: 3},
	local1:      {type: String, persist: false, value: "local1"},
	local2:      {type: String, isLocal: true, value: "local2"},
    number:     {type: Number, value: "23"},
    boolTrue:   {type: Boolean, value: true},
    boolFalse:  {type: Boolean, value: false},
});
var Address = PersistObjectTemplate.create("Address", {
	init:       function (customer) {
		this.customer   = customer;
	},
	lines:      {type: Array, of: String, value: [], max: 3},
	city:       {type: String, value: "", length: 20},
	state:      {type: String, value: "", length: 20},
	postalCode: {type: String, value: "", length: 20},
	country:    {type: String, value: "US", length: 3}
});

Customer.mixin({
    referredBy: {type: Customer, fetch: true},
    referrers:  {type: Array, of: Customer, value: [], fetch: true},
	addAddress: function(lines, city, state, zip) {
		var address = new Address(this);
		address.lines = lines;
		address.city = city;
		address.state = state;
		address.postalCode = zip;
        address.customer = this;
		this.addresses.push(address);
	},
	addresses:  {type: Array, of: Address, value: [], fetch: true}
    });
var ReturnedMail = PersistObjectTemplate.create("ReturnedMail", {
    date: {type: Date},
    address: {type:Address},
    init: function (date)
    {
        this.date = date;
    }
});
Address.mixin({
    customer:  {type: Customer},
    returnedMail: {type: Array, of: ReturnedMail, value: []},
    addReturnedMail: function (date) {
        this.returnedMail.push(new ReturnedMail(date));
    }
});
var Role = PersistObjectTemplate.create("Role", {
	init:       function (customer, account, relationship) {
		this.customer = customer;
		this.account = account;
		if (relationship)
			this.relationship = relationship;
	},
	relationship: {type: String, value: "primary"},
	customer:     {type: Customer}
});

var Account = PersistObjectTemplate.create("Account", {
	init:       function (number, title, customer, address) {
        if (address) {
            this.address = address;
            this.address.account = this;
        }
		this.number = number;
		this.title = title;
		if (customer)
			this.addCustomer(customer);
	},
	addCustomer: function(customer, relationship) {
		var role = new Role(customer, this, relationship);
		this.roles.push(role);
		customer.roles.push(role);
	},
	number:     {type: Number},
	title:      {type: Array, of: String, max: 4},
	roles:      {type: Array, of: Role, value: [], fetch: true},
    address:    {type: Address},
    debit: function (amount) {
       new Transaction(this, 'debit', amount);
    },
    credit: function (amount) {
       new Transaction(this, 'credit', amount);
    },
    transferFrom: function (amount, fromAccount) {
       new Transaction(this, 'xfer', amount, fromAccount)
    },
    transferTo: function (amount, toAccount) {
       new Transaction(toAccount, 'xfer', amount, this);
    },
    getBalance: function () {
        var balance = 0;
        var thisAccount = this;
        function processTransactions  (transactions) {
            for (var ix = 0; ix < transactions.length; ++ix)
                switch (transactions[ix].type) {
                    case 'debit':
                        balance -= transactions[ix].amount;
                        break;
                    case 'credit':
                        balance += transactions[ix].amount;
                        break;
                    case 'xfer':
                        balance += transactions[ix].amount * (transactions[ix].fromAccount == thisAccount ? -1 : 1);
                }
        }
        processTransactions(this.transactions);
        processTransactions(this.fromAccountTransactions);
        return balance;
    }
});
Address.mixin({
    account:  {type: Account}
});
var Transaction = PersistObjectTemplate.create("Transaction", {
	init:       function (account, type, amount, fromAccount) {
		this.account = account;
		this.fromAccount = fromAccount;
		this.type = type;
        this.amount = amount;
        if (account)
            account.transactions.push(this);
		if (fromAccount)
			fromAccount.fromAccountTransactions.push(this);
	},
	amount:     {type: Number},
	type:       {type: String},
	account:    {type: Account, fetch: true},
	fromAccount: {type: Account, fetch: true}
});

Customer.mixin({
	roles:      {type: Array, of: Role, value: []}
});

Role.mixin({
	account: {type: Account}
});

Account.mixin({
	transactions: {type: Array, of: Transaction, value: [], fetch: true},
    fromAccountTransactions: {type: Array, of: Transaction, value: [], fetch: true}
});


var schema = {
    Customer: {
        documentOf: "customer",
        children: {
            roles: {id: "customer_id"},
            referrers: {id: "referred_id", crossDocument: true},
            addresses: {id: "customer_id", crossDocument: true}
        },
        parents: {
            referredBy: {id: "referred_id", crossDocument: true}
        }
    },
    Address: {
        subDocumentOf: "customer",
        parents: {
            account: {id: 'account_id'},
            customer: {id: 'customer_id', crossDocument: true}
        },
        children: {
            returnedMail: {id: 'address_id'}
        }
    },
    ReturnedMail: {
        subDocumentOf: "customer",
        parents: {
            address: {id: 'address_id'}
        }
    },
    Account: {
        documentOf: "account",
        children: {
            roles: {id: "account_id"},
            transactions: {id: "account_id", crossDocument: true},
            fromAccountTransactions: {id: "from_account_id", crossDocument: true}
        },
        parents: {
            address: {id: "address_id"}
        }
    },
    Role: {
        documentOf: "role",
        parents: {
            customer: {id: 'customer_id'},
            account: {id: 'account_id'}
        }
    },
    Transaction: {
        subDocumentOf: "account",
        parents: {
            account: {id: 'account_id', crossDocument: true},
            fromAccount: {id: 'from_account_id', crossDocument: true}
        }
    }
}

var MongoClient = require('mongodb-bluebird');
var Q = require('Q');
var db;

function clearCollection(collectionName) {
    var collection = db.collection(collectionName);
	return collection.remove({}, {w:1}).then (function () {
        return collection.count()
	});
}

describe("Banking Example", function () {

    it ("opens the database", function () {
        console.log("starting banking");
        return MongoClient.connect("mongodb://localhost:27017/testpersist").then(function (dbopen) {
            db = dbopen;
            PersistObjectTemplate.setDB(db);
            PersistObjectTemplate.setSchema(schema);
            PersistObjectTemplate.performInjections(); // Normally done by getTemplates
        }).catch(function(e){throw e;});
    });

    it ("clears the bank", function () {
        return clearCollection("role")
            .then(function (count) {
                expect(count).to.equal(0);
                return clearCollection('account')
            }).then(function (count) {
                expect(count).to.equal(0);
                return clearCollection('customer')
            }).then(function (count) {
                expect(count).to.equal(0);
            }).catch(function(e){throw e;});
    });

    // Setup customers and addresses
    var sam = new Customer("Sam", "M", "Elsamman");
    var karen = new Customer("Karen", "M", "Burke");
    var ashling = new Customer("Ashling", "", "Burke");


    // Setup referrers
    sam.referrers = [ashling, karen];
    ashling.referredBy = sam;
    karen.referredBy = sam;    sam.local1 = "foo";


    sam.local2 = "bar";

    // Setup addresses
    sam.addAddress(["500 East 83d", "Apt 1E"], "New York", "NY", "10028");
    sam.addAddress(["38 Haggerty Hill Rd", ""], "Rhinebeck", "NY", "12572");

    sam.addresses[0].addReturnedMail(new Date());
    sam.addresses[0].addReturnedMail(new Date());
    sam.addresses[1].addReturnedMail(new Date());

    karen.addAddress(["500 East 83d", "Apt 1E"], "New York", "NY", "10028");
    karen.addAddress(["38 Haggerty Hill Rd", ""], "Rhinebeck", "NY", "12572");

    karen.addresses[0].addReturnedMail(new Date());

    ashling.addAddress(["End of the Road", ""], "Lexington", "KY", "34421");

    // Setup accounts
    var samsAccount = new Account(1234, ['Sam Elsamman'], sam, sam.addresses[0]);
    var jointAccount = new Account(123, ['Sam Elsamman', 'Karen Burke', 'Ashling Burke'], sam, karen.addresses[0]);
    jointAccount.addCustomer(karen, "joint");
    jointAccount.addCustomer(ashling, "joint");

    samsAccount.credit(100);                        // Sam has 100
    samsAccount.debit(50)                           // Sam has 50
    jointAccount.credit(200);                       // Joint has 200
    jointAccount.transferTo(100, samsAccount);      // Joint has 100, Sam has 150
    jointAccount.transferFrom(50, samsAccount);     // Joint has 150, Sam has 100
    jointAccount.debit(25);                         // Joint has 125

    it("both accounts have the right balance", function () {
        expect(samsAccount.getBalance()).to.equal(100);
        expect(jointAccount.getBalance()).to.equal(125);
    });

    it("can insert", function (done) {
        sam.persistSave().then(function(id) {
            expect(id.length).to.equal(24);
            expect(sam._id).to.equal(id);
            writing = false;
            done();
        }).catch(function(e){done(e)});
    });
    it("Accounts have addresses", function (done) {
        Account.getFromPersistWithQuery(null,{address: true}).then (function (accounts) {
            expect(accounts.length).to.equal(2);
            expect(accounts[0].address.__template__.__name__).to.equal('Address');
            done();
        }).catch(function(e) {
            done(e)
        })
    });
    it("Can find debits and credits >= 200 with a $in", function (done) {
        Transaction.getFromPersistWithQuery({type: {$in: ['debit', 'credit']}, amount:{'$gte': 200}}).then (function (transactions) {
            expect(transactions.length).to.equal(1);
            expect(transactions[0].amount).to.equal(200);
            done();
        }).catch(function(e) {
            done(e)
        })
    });
    it("Can find debits and credits >= 200 with a $in", function (done) {
        Transaction.getFromPersistWithQuery({type: {$in: ['debit', 'credit']}, amount:{'$in': [200, 100], $gt: 100}}).then (function (transactions) {
            expect(transactions.length).to.equal(1);
            expect(transactions[0].amount).to.equal(200);
            done();
        }).catch(function(e) {
            done(e)
        })
    });

    it("Can find debits and credits with a $or", function (done) {
        Transaction.getFromPersistWithQuery({'$or':[{type: 'debit'}, {type: 'credit'}]}).then (function (transactions) {
            expect(transactions.length).to.equal(4);
            expect(transactions[0].type).to.not.equal('xfer');
            expect(transactions[1].type).to.not.equal('xfer');
            expect(transactions[2].type).to.not.equal('xfer');
            expect(transactions[3].type).to.not.equal('xfer');
            done();
        }).catch(function(e) {
            done(e)
        })
    });

    it("Can find debits and credits with a $in", function (done) {
        Transaction.getFromPersistWithQuery({type: {$in: ['debit', 'credit']}}).then (function (transactions) {
            expect(transactions.length).to.equal(4);
            expect(transactions[0].type).to.not.equal('xfer');
            expect(transactions[1].type).to.not.equal('xfer');
            expect(transactions[2].type).to.not.equal('xfer');
            expect(transactions[3].type).to.not.equal('xfer');
            done();
        }).catch(function(e) {
            done(e)
        })
    });

    it("Can fetch all transactions", function (done) {
        Transaction.getFromPersistWithQuery({}).then (function (transactions) {
            expect(transactions.length).to.equal(6);
            done();
        }).catch(function(e) {
            done(e)
        })
    });
    it("Can fetch transfers", function (done) {
        Transaction.getFromPersistWithQuery({type: 'xfer'},{account: true, fromAccount: true}).then (function (transactions) {
            expect(transactions.length).to.equal(2);
            expect(transactions[0].type).to.equal('xfer');
            expect(transactions[1].type).to.equal('xfer');
            expect(transactions[0].fromAccount.__template__.__name__).to.equal('Account');
            expect(transactions[0].account.__template__.__name__).to.equal('Account');
            done();
        }).catch(function(e) {
            done(e)
        })
    });
    it("can fetch a pojo", function () {
        return PersistObjectTemplate.getPOJOFromQuery(Customer, {firstName: "Sam"}).then(function (pojo) {
            expect(pojo[0].firstName).to.equal("Sam");
        });
    });

    it("sam looks good", function (done) {
        Customer.getFromPersistWithId(sam._id, {roles: true}).then (function (customer) {
            expect(customer.firstName).to.equal("Sam");
            expect(customer.local1).to.equal("local1");
            expect(customer.local2).to.equal("local2");
            expect(customer.number).to.equal(23);
            expect(customer.boolTrue).to.equal(true);
            expect(customer.boolFalse).to.equal(false);
            expect(customer.roles[0].relationship).to.equal("primary");
            expect(customer.roles[0].customer).to.equal(customer);
            expect(customer.roles[0].accountPersistor.isFetched).to.equal(false);

            return customer.roles[0].fetch({account: {fetch: {roles: {fetch: {customer: {fetch: {roles: true}}}}}}}).then( function ()
            {
                expect(customer.roles[0].account.number).to.equal(123);
                var primaryRole = customer.roles[0].account.roles[0].relationship == 'primary' ?
                    customer.roles[0].account.roles[0] : customer.roles[0].account.roles[1];
                expect(primaryRole).to.equal(customer.roles[0]);
                var jointRole = customer.roles[0].account.roles[0].relationship == 'joint' ?
                    customer.roles[0].account.roles[0] : customer.roles[0].account.roles[1];
                expect(jointRole).to.equal(jointRole.customer.roles[0]);
                expect(customer.addresses[0].lines[0]).to.equal("500 East 83d");
                expect(customer.addresses[1].lines[0]).to.equal("38 Haggerty Hill Rd");
                expect(customer.addresses[1].customer).to.equal(customer);

                expect(customer.addresses[0].returnedMail.length).to.equal(2);
                expect(customer.addresses[1].returnedMail.length).to.equal(1);

                var sam = customer;
                var r1 = customer.referrers[0];
                var r2 = customer.referrers[1];
                var karen = r1.firstName == "Karen" ? r1 : r2;
                var ashling = r1.firstName == "Karen" ? r2 : r1;
                expect(karen.firstName).to.equal("Karen");
                expect(ashling.firstName).to.equal("Ashling");
                done();
            });
        }).catch(function(e){
            done(e)
        });
    });
    it("has a correct joint account balance for sam", function (done) {
        Account.getFromPersistWithId(samsAccount._id, {roles: true}).then (function (account) {
            expect(account.getBalance()).to.equal(samsAccount.getBalance());
            done();
        }).catch(function(e){
            done(e)
        });
    });
    it("has a correct joint account balance for the joint account", function (done) {
        Account.getFromPersistWithId(jointAccount._id, {roles: true}).then (function (account) {
            expect(account.getBalance()).to.equal(jointAccount.getBalance());
            done();
        }).catch(function(e) {
            done(e)
        })
    });
    it("Can fetch all transactions", function (done) {
        Transaction.getFromPersistWithQuery({}).then (function (transactions) {
            expect(transactions.length).to.equal(6);
            done();
        }).catch(function(e) {
            done(e)
        })
    });
    it("Can change things to null", function (done) {
        Customer.getFromPersistWithId(sam._id, {roles: true, referredBy: true}).then (function (customer) {
           customer.firstName = null;
           customer.referredBy = null;
           return customer.persistSave()
        }).then (function () {
           return Customer.getFromPersistWithId(sam._id, {roles: true, referredBy: true})
        }).then (function (customer) {
           expect(customer.firstName).to.equal(null);
           expect(customer.referredBy).to.equal(null);
           done();
        }.bind(this)).catch(function(e) {
            done(e)
        })
    });
/*
    it ("can serialize and deserialize", function(done) {
        Customer.getFromPersistWithId(customer_id, {roles: {account: true}}).then (function (customer) {
            var str = customer.toJSONString();
            var customer2 = Customer.fromJSON(str);
            return verifyCustomer(customer2).then(function () {;
                done();
            });
        }).catch(function(e){done(e)});
    });
*/

    it("can delete", function (done) {
        Customer.getFromPersistWithId(sam._id,
            {roles: {fetch: {account: {fetch: {roles: {fetch: {customer: {fetch: true}}}}}}}}).then (function (customer) {
            var promises = [];
            for (var ix = 0; ix < customer.roles.length; ++ix) {
                var account = customer.roles[ix].account;
                for (var jx = 0; jx < account.roles.length; ++jx) {
                    promises.push(account.roles[jx].persistDelete());
                    promises.push(account.roles[jx].customer.persistDelete());
                }
                promises.push(account.persistDelete())
                promises.push(customer.roles[0].persistDelete());
            }
            promises.push(customer.persistDelete());
            return Q.allSettled(promises).then (function () {
                return Customer.countFromPersistWithQuery()
            }).then (function (count) {
                expect(count).to.equal(0);
                return Account.countFromPersistWithQuery()
            }).then(function (count) {
                expect(count).to.equal(0);
                return Role.countFromPersistWithQuery()
            }).then(function (count) {
                expect(count).to.equal(0);
                done();
            });
        }).catch(function(e){done(e)});
    });

    it("closes the database", function (done) {
        db.close().then(function () {
            console.log("ending banking");
            done()
        });
    });

});
