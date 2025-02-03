package cn.soopy.tika.service;

import cn.soopy.tika.dto.UserDTO;
import cn.soopy.tika.dto.UserLoginDTO;
import cn.soopy.tika.entity.User;
import cn.soopy.tika.vo.UserStatusVO;

public interface UserService {

    /**
     * 用户登陆
     * @param userLoginDTO
     */
    User login(UserLoginDTO userLoginDTO);

    /**
     * 用户注册
     * @param userDTO
     */
    void register(UserDTO userDTO);

    /**
     * 获取当前用户相关信息
     * @return
     */
    UserStatusVO getStatus();
}
