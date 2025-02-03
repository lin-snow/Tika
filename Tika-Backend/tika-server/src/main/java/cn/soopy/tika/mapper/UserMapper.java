package cn.soopy.tika.mapper;

import cn.soopy.tika.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserMapper {
    /**
     * 根据用户信息查找用户
     * @param newUser
     * @return
     */
    @Select("SELECT * from user WHERE username = #{username}")
    User getUserByUsername(User newUser);

    /**
     * 根据用户ID查找用户
     * @param id
     * @return
     */
    @Select("SELECT * from user WHERE id = #{id}")
    User getUserById(Long id);

    /**
     * 插入新用户
     * @param newUser
     */
    void insert(User newUser);
}
