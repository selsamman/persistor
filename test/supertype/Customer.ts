import {Supertype, supertypeClass, property} from '../../index';
import {Role} from './Role';
import {Address} from './Address';

@supertypeClass
export class Customer extends Supertype {

    constructor (first, middle, last) {
        super();
        this.firstName = first;
        this.lastName = last;
        this.middleName = middle;
        this.setDirty();
    }

    @property()
    email: string = '';

    @property()
    firstName: string = '';

    @property()
    middleName: string = '';

    @property()
    lastName: string = '';

    @property()
    local1: string = 'local1';

    @property()
    local2: string = 'local2';

    @property()
    nullNumber: number = null;

    @property()
    nullDate: Date = null;

    @property()
    nullString: string = null;

    @property({of: Role})
    roles:  Array<Role> = [];

    @property()
    referredBy: Customer;

    @property()
    type: string = 'primary';

    @property({fetch: true, of: Customer})
    referrers:  Array<Customer>;

    @property({fetch: true, of: Customer})
    secondaryReferrers:  Array<Customer> = [];

    addAddress (type, lines, city, state, zip) {
        var address = new Address(this);
        address.lines = lines;
        address.city = city;
        address.state = state;
        address.postalCode = zip;
        address.customer = this;
        this[type == 'primary' ? 'primaryAddresses' : 'secondaryAddresses'].push(address);
    }

    @property({of: Address, fetch: true})
    primaryAddresses: Array<Address> = [];

    @property({of: Address, fetch: true})
    secondaryAddresses:  Array<Address> = []
}