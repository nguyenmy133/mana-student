

export class CourseModel {
    id :string;
    nameCourse :string;
    description :string;
    room :string;
    dayWeek :string;
    timeStudy :string;
    color :string;

    constructor(id: string, nameCourse: string, description: string, room: string, dayWeek: string, timeStudy: string, color: string) {
        this.id = id;
        this.nameCourse = nameCourse;
        this.description = description;
        this.room = room;
        this.dayWeek = dayWeek;
        this.timeStudy = timeStudy;
        this.color = color;
    }
}