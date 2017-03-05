import {Supertype, supertypeClass, property} from '../../index';
import {Responsibility} from './Responsibility';

@supertypeClass
export class Employee extends Supertype {
    constructor(firstName, lastName) {
        super();

        this.firstName = firstName;
        this.lastName = lastName;
    }

    @property()
    firstName: string = '';

    @property()
    lastName: string = '';

    @property({type: Responsibility})
    responsibilities:  Array<Responsibility> = [];
}