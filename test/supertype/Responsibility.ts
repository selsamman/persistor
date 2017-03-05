import {Supertype, supertypeClass, property} from '../../index';
import {Employee} from './Employee';

@supertypeClass
export class Responsibility extends Supertype {
    constructor(type, details) {
        super();
        this.type = type;
        this.details = details;
        this.setDirty();
    }

    @property()
    type: string = '';

    @property()
    details: string = '';

    @property({getType: () => {return Employee}})
    employee: Employee;
}