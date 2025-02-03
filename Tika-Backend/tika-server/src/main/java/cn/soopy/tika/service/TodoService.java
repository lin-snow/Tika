package cn.soopy.tika.service;

import cn.soopy.tika.dto.TodoDTO;
import cn.soopy.tika.dto.TodoPageQueryDTO;
import cn.soopy.tika.dto.UpdateTodoDTO;
import cn.soopy.tika.result.PageResult;
import cn.soopy.tika.vo.CategoryVO;
import cn.soopy.tika.vo.TodoVO;

import java.util.List;

public interface TodoService {
    /**
     * 添加to do
     * @param todoDTO
     */
    void addTodo(TodoDTO todoDTO);

    /**
     * to do 分页查询
     * @param todoPageQueryDTO
     * @return
     */
    PageResult<TodoVO> pageQuery(TodoPageQueryDTO todoPageQueryDTO);

    /**
     * to do 删除
     * @param id
     */
    void deleteTodo(Long id);

    /**
     * 更新to do
     * @param updateTodoDTO
     */
    void udpateTodo(UpdateTodoDTO updateTodoDTO);

    /**
     * 获取用户的分类数据
     * @return
     */
    List<CategoryVO> getCategories();
}
