import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { GroupRole } from "../../common/enums/role.enum";
import { User } from "../../users/entities/user.entity";
import { Group } from "./group.entity";

@Entity("group_members")
@Unique(["userId", "groupId"])
export class GroupMember {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", name: "user_id" })
  userId: string;

  @Column({ type: "uuid", name: "group_id" })
  groupId: string;

  @Column({ type: "enum", enum: GroupRole, default: GroupRole.USER })
  role: GroupRole;

  @CreateDateColumn({ name: "joined_at" })
  joinedAt: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Group, (group) => group.members, { onDelete: "CASCADE" })
  @JoinColumn({ name: "group_id" })
  group: Group;
}
