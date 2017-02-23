import {Supertype, supertypeClass, property} from '../../index';
import {Customer} from './Customer';
import {Account} from './Account';
import {ReturnedMail} from './ReturnedMail';

@supertypeClass
export class Address extends Supertype {

    constructor (customer) {
        super();
        this.customer   = customer;
        this.setDirty();
    }

    @property()
    lines: Array<string> = [];

    @property()
    city: string = '';

    @property()
    state: string = '';

    @property()
    postalCode:  string = '';

    @property()
    country: string = 'US';

    @property()
    customer: Customer;

    @property()
    type: string;

    @property({of: ReturnedMail})
    returnedMail: Array<ReturnedMail> = [];

    @property()
    account: Account;

    addReturnedMail (date) {
        this.returnedMail.push(new ReturnedMail(this, date));
    }
}
